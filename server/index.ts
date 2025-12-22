import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Import your routes
import authRoutes from "./routes/authRoutes";
import clientRoutes from "./routes/clientRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import invoiceItemRoutes from "./routes/invoiceItemRoutes";
import loanRoutes from "./routes/loanRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import webhookRoutes from "./routes/webhookRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// Trust proxy - required for Railway/production behind reverse proxy
app.set("trust proxy", 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow Vite bundled scripts
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Limit auth attempts
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

app.use(compression());

// Health check endpoint - must be before all middleware
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// CORS only needed in development
if (process.env.NODE_ENV !== "production") {
  app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
  }));
}

// Webhook routes need raw body for signature verification
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhookRoutes);

app.use(express.json());

// Apply general rate limiter to all routes
app.use("/api/", limiter);

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/invoice-items", invoiceItemRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// Serve static files from client build in production
if (process.env.NODE_ENV === "production") {
  // Try multiple possible paths for the client build
  const possiblePaths = [
    path.join(__dirname, "../client/dist"),
    path.join(__dirname, "../../client/dist"),
    path.join(__dirname, "../dist/client")
  ];
  
  let clientPath = possiblePaths[0];
  const fs = require("fs");
  
  for (const testPath of possiblePaths) {
    if (fs.existsSync(testPath)) {
      clientPath = testPath;
      console.log(`✅ Found client dist at: ${clientPath}`);
      break;
    }
  }
  
  app.use(express.static(clientPath));
  
  // Serve index.html for all non-API routes
  app.get("*", (req, res) => {
    const indexPath = path.join(clientPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Application not found. Please check deployment configuration.");
    }
  });
}

app.use(errorHandler);

const PORT = parseInt(process.env.PORT || "5000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Database: ${process.env.DATABASE_URL ? "Connected" : "No DATABASE_URL found"}`);
});
