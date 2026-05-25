const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Prisma 7 Adapter Setup
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // We will lock this down to your actual Vercel URL later for security
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', database: 'Connected' });
});

// --- AI SMART SEARCH ROUTE ---
app.post('/api/ai/search', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // 1. Ask the AI to act as a pharmacist
   const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const aiPrompt = `You are a wholesale pharmacist assistant. The user searched for: "${prompt}". 
    Return a comma-separated list of 3 actual medical chemical compositions or generic drug names that match this request. 
    (For example, if they say 'acidity', return 'pantoprazole, omeprazole, rabeprazole'. If they misspell 'paractemol', return 'paracetamol'). 
    Only return the comma-separated list, no other text.`;

    const result = await aiModel.generateContent(aiPrompt);
    const aiKeywords = result.response.text().toLowerCase().split(',').map(s => s.trim());

    // --- NEW LINE: Add the original user prompt to the search list! ---
    aiKeywords.push(prompt.toLowerCase().trim());

    // 2. Search PostgreSQL database using the AI's cleaned keywords + original prompt
    const searchConditions = aiKeywords.map(keyword => ({
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { composition: { contains: keyword, mode: 'insensitive' } }
      ]
    }));

    const matchedMedicines = await prisma.medicine.findMany({
      where: { OR: searchConditions },
      include: { firm: true }
    });

    res.json({ aiInterpretedAs: aiKeywords, results: matchedMedicines });
  } catch (error) {
    console.error("AI Search Error:", error);
    res.status(500).json({ error: "AI Assistant failed to process request" });
  }
});

// --- AI VISION AGENT (SNAP & ORDER) ---
app.post('/api/ai/vision-order', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    
    // Extract the raw base64 data and mime type from the frontend string
    const mimeType = imageBase64.match(/data:(.*?);base64,/)[1];
    const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Flash is excellent for vision tasks
    
    const prompt = `You are an expert Indian pharmacist reading a handwritten shortage list (parchi) from a medical store. 
    Read the handwriting and identify the medicine names. 
    Return ONLY a comma-separated list of the medicine names or compositions you can read. 
    Ignore quantities, numbers, or random scribbles. Do not include any other text or markdown.`;

    const imagePart = {
      inlineData: {
        data: rawBase64,
        mimeType
      }
    };

    const result = await aiModel.generateContent([prompt, imagePart]);
    const aiText = result.response.text();
    
    // Clean up the AI's response into an array
    const aiKeywords = aiText.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

    if (aiKeywords.length === 0) {
      return res.json({ aiInterpretedAs: [], results: [] });
    }

    // Search the database for the items the AI found
    const searchConditions = aiKeywords.map(keyword => ({
      OR: [
        { name: { contains: keyword, mode: 'insensitive' } },
        { composition: { contains: keyword, mode: 'insensitive' } }
      ]
    }));

    const matchedMedicines = await prisma.medicine.findMany({
      where: { OR: searchConditions },
      include: { firm: true }
    });

    res.json({ aiInterpretedAs: aiKeywords, results: matchedMedicines });

  } catch (error) {
    console.error("Vision AI Error:", error);
    res.status(500).json({ error: "Vision Assistant failed to read the image" });
  }
});

// --- UPGRADED SMART SUBSTITUTE AGENT (CONTEXT-AWARE) ---
app.post('/api/ai/substitute', async (req, res) => {
  try {
    const { medicineName } = req.body;
    
    // 1. Fetch ALL medicine names from your database
    const allMedicines = await prisma.medicine.findMany({
      select: { name: true }
    });
    
    // Create a giant comma-separated list of your actual inventory
    const inventoryNames = allMedicines.map(m => m.name).join(', ');

   const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // 2. Tell Gemini to match the chemicals to the EXACT inventory names
    const prompt = `You are an expert Indian pharmacist. The user is looking for a medical substitute for the brand "${medicineName}".
    
    Step 1: Identify the primary active chemical ingredients of "${medicineName}".
    Step 2: Carefully review our exact inventory list:
    [${inventoryNames}]
    
    Step 3: Find any medicines in our inventory that act as a substitute (i.e., contain the same active ingredients).
    
    Return ONLY a valid JSON object with two fields:
    - "chemicals": An array of strings representing the core chemicals.
    - "substitutes": An array of EXACT strings from our inventory list that are valid substitutes.
    
    Do not use markdown blocks like \`\`\`json.
    Example format: {"chemicals": ["paracetamol"], "substitutes": ["PARALO-V TAB", "ACIKILL-V (TAB 1X80)"]}`;

    const result = await aiModel.generateContent(prompt);
    let aiText = result.response.text().trim();
    
    // Clean up markdown if Gemini accidentally included it
    if (aiText.startsWith('```json')) aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    if (aiText.startsWith('```')) aiText = aiText.replace(/```/g, '').trim();
    
    const aiData = JSON.parse(aiText);

    if (!aiData.substitutes || aiData.substitutes.length === 0) {
      return res.json({ aiInterpretedAs: aiData.chemicals || [], results: [] });
    }

    // 3. Search DB for the EXACT matched names Gemini found
    const matchedSubstitutes = await prisma.medicine.findMany({
      where: { name: { in: aiData.substitutes } },
      include: { firm: true }
    });

    res.json({ aiInterpretedAs: aiData.chemicals, results: matchedSubstitutes });

  } catch (error) {
    console.error("Substitute AI Error:", error);
    res.status(500).json({ error: "Substitute AI failed" });
  }
});
// Fetch all medicines
app.get('/api/medicines', async (req, res) => {
  try {
    const medicines = await prisma.medicine.findMany({
      include: { firm: true }
    });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// --- UPDATE MEDICINE (ADMIN) ---
app.put('/api/medicines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, composition, price, stock, firmId } = req.body;
    
    const updatedMedicine = await prisma.medicine.update({
      where: { id: parseInt(id) },
      data: { 
        name, 
        composition, 
        price: parseFloat(price), 
        stock: parseInt(stock), 
        firmId: parseInt(firmId) 
      }
    });
    
    res.json({ message: "Medicine updated successfully", medicine: updatedMedicine });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ error: "Failed to update medicine" });
  }
});
// --- USER REGISTRATION ---
app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, password, gstNumber, licenseNumber, address } = req.body;

    // 2. Add a quick validation check
    if (!licenseNumber) {
      return res.status(400).json({ error: "Drug License Number is required" });
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) return res.status(400).json({ error: "Phone number already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Include licenseNumber when creating the user
    const newUser = await prisma.user.create({
  data: { name, phone, password: hashedPassword, gstNumber, licenseNumber, address }
});

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// --- USER LOGIN ---
app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user by phone number
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Generate a secure token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      message: "Login successful", 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        role: user.role,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        gstNumber: user.gstNumber,
        address: user.address
      } 
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- 1. REQUEST PASSWORD RESET (GENERATE OTP) ---
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });
    
    if (!user) return res.status(404).json({ error: "This phone number is not registered." });

    // Generate a 4-digit OTP and set expiry for 10 minutes from now
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiry = new Date(Date.now() + 10 * 60000); 

    await prisma.user.update({
      where: { phone },
      data: { resetOtp: otp, resetOtpExpiry: expiry }
    });

    // NOTE: In production, send this via Twilio WhatsApp. 
    // For development, we log it to the console so you can see it!
    console.log(`\n================================`);
    console.log(`🔐 OTP for ${user.name} (${phone}) is: ${otp}`);
    console.log(`================================\n`);

    res.json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// --- 2. VERIFY OTP & SET NEW PASSWORD ---
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { phone } });

    // Security Checks
    if (!user || user.resetOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP code." });
    }
    if (new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Hash the new password and clear the OTP fields
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { phone },
      data: { 
        password: hashedPassword, 
        resetOtp: null, 
        resetOtpExpiry: null 
      }
    });

    res.json({ message: "Password has been successfully reset!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});
// --- ADD A NEW MEDICINE (ADMIN) ---
app.post('/api/medicines', async (req, res) => {
  try {
    const { name, composition, price, stock, firmId } = req.body;
    
    const newMedicine = await prisma.medicine.create({
      data: { 
        name, 
        composition, 
        price: parseFloat(price), 
        stock: parseInt(stock), 
        firmId: parseInt(firmId) 
      }
    });
    
    res.status(201).json({ message: "Medicine added successfully", medicine: newMedicine });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add medicine" });
  }
});

// --- GET ALL FIRMS ---
app.get('/api/firms', async (req, res) => {
  try {
    const firms = await prisma.firm.findMany();
    res.json(firms);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch firms" });
  }
});

// --- GET UNREAD NOTIFICATIONS (ADMIN) ---
app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20 // Get last 20 notifications
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// --- PLACE AN ORDER ---
app.post('/api/orders', async (req, res) => {
  try {
    const { userId, firmId, items } = req.body; 
    
    // 1. Fetch the full user details to get their location
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });

    // 2. Create the Order
    const newOrder = await prisma.order.create({
      data: {
        userId: parseInt(userId),
        firmId: parseInt(firmId),
        cartItems: items,
        status: "PENDING"
      }
    });

    // 3. Calculate total and format the notification message
    const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // --- NEW: KHATA LEDGER LOGIC ---
    // Increase user's outstanding balance
    // await prisma.user.update({
    //   where: { id: parseInt(userId) },
    //   data: { balance: { increment: orderTotal } }
    // });
    // Record the transaction
    await prisma.transaction.create({
      data: {
        userId: parseInt(userId),
        amount: orderTotal,
        type: "ORDER",
        description: `Order #${newOrder.id} Placed`
      }
    });
    const alertMessage = `🚨 NEW ORDER #${newOrder.id}\n👤 ${user.name}\n📍 ${user.address}\n📞 ${user.phone}\n💰 Total: ₹${orderTotal}`;

    // 4. Save In-App Notification to Database
    await prisma.notification.create({
      data: { message: alertMessage }
    });

    // 5. Trigger WhatsApp Notification (Placeholder logic)
    // To send real WhatsApp messages, you will need to sign up for Twilio or UltraMsg.
    // axios.post('https://api.ultramsg.com/instanceXXX/messages/chat', { token: 'YOUR_TOKEN', to: 'YOUR_FATHERS_NUMBER', body: alertMessage });
    console.log("WhatsApp Message Sent:", alertMessage);

    res.status(201).json({ message: "Order placed successfully!", orderId: newOrder.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

// --- GET ALL ORDERS (ADMIN ONLY) ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true, firm: true },
      orderBy: { createdAt: 'desc' } // Newest first
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// --- UPDATE ORDER STATUS (ADMIN ONLY) ---
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order" });
  }
});
// --- GET USER'S SPECIFIC ORDERS (CUSTOMER) ---
app.get('/api/users/:userId/orders', async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId) },
      include: { firm: true },
      orderBy: { createdAt: 'desc' } // Shows newest orders first
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});
// --- SMART RESTOCK PREDICTOR AGENT ---
app.get('/api/users/:userId/recommendations', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 1. Fetch all past orders for this specific customer
    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId) }
    });

    if (orders.length === 0) return res.json([]);

    // 2. Algorithm: Count which items they buy the most
    const itemScores = {};
    
    orders.forEach(order => {
      order.cartItems.forEach(item => {
        if (!itemScores[item.id]) {
          // Store the item details and start a counter
          itemScores[item.id] = { 
            ...item, 
            score: 0 
          };
        }
        // Increase score based on how many times they ordered it
        itemScores[item.id].score += 1; 
      });
    });

    // 3. Sort by the highest score and take the top 3 items
    const recommendations = Object.values(itemScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    res.json(recommendations);
  } catch (error) {
    console.error("Predictor Error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// --- ADMIN: GET ALL CUSTOMERS FOR KHATA ---
app.get('/api/users/ledger', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      // FIX: Added licenseNumber and address here!
      select: { id: true, name: true, phone: true, balance: true, khataNote: true, licenseNumber: true, address: true },
      orderBy: { balance: 'desc' } 
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch ledger" });
  }
});

// --- ADMIN: RECORD A PAYMENT (CLEAR BALANCE) ---
app.post('/api/users/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method } = req.body;
    const paymentAmount = parseFloat(amount);

    // Decrease the user's balance
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { balance: { decrement: paymentAmount } }
    });

    // Record the payment in the ledger
    await prisma.transaction.create({
      data: {
        userId: parseInt(id),
        amount: -paymentAmount, // Negative because it reduces debt
        type: "PAYMENT",
        description: `Payment Received via ${method}`
      }
    });

    res.json({ message: "Payment recorded successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// --- ADMIN: SMART BULK EXCEL UPLOAD (WITH DEDUPLICATION & FIRM AUTO-DETECT) ---
app.post('/api/medicines/bulk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Safely parse the firmId sent from the frontend dropdown
    let targetFirmId = parseInt(req.body.firmId);
    if (isNaN(targetFirmId)) targetFirmId = 1;

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Auto-detect firm from MARG ERP Header
    const headerFirmName = String(rows[0]?.[0] || '').trim();
    if (headerFirmName) {
      // Use var or let outside to avoid block-scoping traps, or just use it to update targetFirmId
      const detectedFirm = await prisma.firm.findFirst({
        where: { name: { equals: headerFirmName, mode: 'insensitive' } }
      });
      if (detectedFirm) targetFirmId = detectedFirm.id; 
    }

    // 1. Fetch the actual firm details from the database using the final targetFirmId
    const firmRecord = await prisma.firm.findUnique({ 
      where: { id: targetFirmId } 
    });

    // 2. Set the default company to the Firm's name safely so it NEVER crashes or says "Unknown"
    let currentCompany = firmRecord ? firmRecord.name : "Partner Brand"; 
    
    const rawMedicines = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const col0 = String(row[0] || '').trim(); // SNo. or Company Header
      const col1 = String(row[1] || '').trim(); // Medicine Name
      const col2 = String(row[2] || '').trim(); // Description
      const mrp = parseFloat(row[4]);           // M.R.P. (Index 4)

      const skipKeywords = ['LIST OF ITEMS', 'SNo.', 'Page', 'Continued', 'Import Purchase', 'Phone', 'GSTIN', 'MOHALLA'];
      
      // Skip junk rows
      if (skipKeywords.some(keyword => col0.includes(keyword) || col1.includes(keyword)) || col0 === headerFirmName) {
        continue;
      }

      // --- THE BULLETPROOF HEADER DETECTOR ---
      // In Marg ERP, a company header is when Column A has text AND Column B is totally empty
      if (col0 !== "" && isNaN(parseFloat(col0)) && col1 === "") {
        currentCompany = col0; 
        continue;
      }

      // --- PARSE THE MEDICINE ROW ---
      // If Column A is a valid SNo. number, and Column B has the medicine name
      if (!isNaN(parseFloat(col0)) && col1 !== "") {
        let fullName = col2 ? `${col1} (${col2.replace(/\s+/g, ' ').trim()})` : col1;
        
        rawMedicines.push({
          name: fullName,
          composition: "", 
          price: isNaN(mrp) ? 0 : mrp, // Map MRP to price
          stock: 100, 
          company: currentCompany, 
          firmId: targetFirmId
        });
      }
    }

    // --- SMART DEDUPLICATION LOGIC ---
    
    // Step A: Remove any duplicates that might exist INSIDE the Excel file itself
    const uniqueMedicinesMap = new Map();
    rawMedicines.forEach(med => {
      uniqueMedicinesMap.set(med.name, med);
    });
    const uniqueParsedMedicines = Array.from(uniqueMedicinesMap.values());

    // Step B: Ask the database which of these medicines it ALREADY has for this Firm
    const existingMedicines = await prisma.medicine.findMany({
      where: {
        firmId: targetFirmId,
        name: { in: uniqueParsedMedicines.map(m => m.name) }
      },
      select: { name: true } // We only need to check the names
    });
    
    const existingNamesSet = new Set(existingMedicines.map(m => m.name));

    // Step C: Filter our parsed list to keep ONLY the completely new ones
    const totallyNewMedicines = uniqueParsedMedicines.filter(med => !existingNamesSet.has(med.name));

    // 3. Save ONLY the new items to the database
    if (totallyNewMedicines.length > 0) {
      await prisma.medicine.createMany({ 
        data: totallyNewMedicines 
      });
    }

    // Clean up temporary file
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    res.json({ 
      message: `File processed! Added ${totallyNewMedicines.length} completely new medicines. (Skipped ${uniqueParsedMedicines.length - totallyNewMedicines.length} existing items)` 
    });
    
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ error: "Failed to process MARG ERP Excel file" });
  }
});

// --- UPGRADED VOICE-TO-CART AI AGENT (FUZZY MATCHING) ---
app.post('/api/ai/voice-order', async (req, res) => {
  try {
    const { transcript } = req.body;
    
    // 1. Fetch ALL medicine names from your database
    const allMedicines = await prisma.medicine.findMany({
      select: { name: true }
    });
    
    // Create a giant comma-separated list of your actual inventory
    const inventoryNames = allMedicines.map(m => m.name).join(', ');

    const aiModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // 2. Tell Gemini to match the voice text to the EXACT inventory names
    const prompt = `You are an expert Indian pharmacist assistant. 
    The user spoke this order: "${transcript}".
    
    Here is the exact list of available medicines in our inventory:
    [${inventoryNames}]

    Your job is to match the spoken words to the closest exact names from the inventory list. 
    Account for phonetic spelling mistakes (e.g., if they say "action cough", you must map it to "ACTIONCUFF (SYP 110ML)" if it exists in the list).
    If they don't specify a quantity, default to 1.
    
    Return ONLY a valid JSON array of objects. Do not use markdown blocks like \`\`\`json.
    Example format: [{"name": "EXACT_INVENTORY_NAME", "qty": 5}]`;

    const result = await aiModel.generateContent(prompt);
    let aiText = result.response.text().trim();
    
    // Clean up markdown if Gemini accidentally included it
    if (aiText.startsWith('```json')) aiText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
    if (aiText.startsWith('```')) aiText = aiText.replace(/```/g, '').trim();
    
    const orderItems = JSON.parse(aiText);
    const matchedResults = [];

    // 3. Search DB for the EXACT matched names Gemini found
    for (const item of orderItems) {
      const medicine = await prisma.medicine.findFirst({
        where: { name: item.name }, // Now searching for exact match
        include: { firm: true }
      });
      
      if (medicine) {
        matchedResults.push({ ...medicine, spokenQty: item.qty });
      }
    }

    res.json({ results: matchedResults });
  } catch (error) {
    console.error("Voice AI Error:", error);
    res.status(500).json({ error: "Voice Assistant failed to process order" });
  }
});

// --- ADMIN: MANUALLY OVERWRITE KHATA & NOTES ---
app.put('/api/users/:id/khata', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, khataNote } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { 
        balance: parseFloat(amount), // Repurposing balance as the manual amount
        khataNote: khataNote 
      }
    });
    res.json({ message: "Khata updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Failed to update Khata" });
  }
});

// --- GET SPECIFIC USER KHATA DETAILS ---
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: { balance: true, khataNote: true } // Only send safe data
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});