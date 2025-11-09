import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import compression from "compression"; // Add this import

// Import your routes
import authRoutes from "./routes/authRoutes";
import clientRoutes from "./routes/clientRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import paymentRoutes from "./routes/paymentRoutes";
import invoiceItemRoutes from "./routes/invoiceItemRoutes";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// Fix the compression middleware application
app.use(compression()); // This should now work

app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/invoice-items", invoiceItemRoutes);

// Serve static files from the React app in production
if (process.env.NODE_ENV === "production") {
  // Serve static files from client/dist
  app.use(express.static(path.join(__dirname, "../../client/dist")));

  // For any request that doesn't match an API route, send the React app
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
