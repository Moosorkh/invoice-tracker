import express from "express";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/routeHandler";
import { prisma } from "../utils/prisma";
import {
  createInvoiceItemSchema,
  updateInvoiceItemSchema,
} from "../validators/invoiceItemValidator";

const router = express.Router();

router.use(authMiddleware);

// Create Invoice Item
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const validatedData = createInvoiceItemSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: validatedData.invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const amount = new Prisma.Decimal(validatedData.quantity).mul(validatedData.unitPrice);

    const item = await prisma.invoiceItem.create({
      data: {
        ...validatedData,
        amount,
      },
    });

    // Update invoice total
    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId: validatedData.invoiceId },
    });

    const totalAmount = items.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0)
    );

    await prisma.invoice.update({
      where: { id: validatedData.invoiceId },
      data: { amount: totalAmount },
    });

    res.status(201).json(item);
  })
);

// Get all items for an invoice
router.get(
  "/invoice/:invoiceId",
  asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Verify invoice belongs to tenant
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId },
      orderBy: { createdAt: "asc" },
    });

    res.json(items);
  })
);

// Update Invoice Item
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const validatedData = updateInvoiceItemSchema.parse(req.body);
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Get item and verify access
    const item = await prisma.invoiceItem.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!item || item.invoice.tenantId !== tenantId) {
      return res.status(404).json({ error: "Invoice item not found" });
    }

    // Calculate new amount
    const quantity = validatedData.quantity ? new Prisma.Decimal(validatedData.quantity) : item.quantity;
    const unitPrice = validatedData.unitPrice ? new Prisma.Decimal(validatedData.unitPrice) : item.unitPrice;
    const amount = quantity.mul(unitPrice);

    const updatedItem = await prisma.invoiceItem.update({
      where: { id },
      data: {
        ...validatedData,
        amount,
      },
    });

    // Update invoice total
    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId: item.invoiceId },
    });

    const totalAmount = items.reduce(
      (sum, i) => sum.add(i.amount),
      new Prisma.Decimal(0)
    );

    await prisma.invoice.update({
      where: { id: item.invoiceId },
      data: { amount: totalAmount },
    });

    res.json(updatedItem);
  })
);

// Delete Invoice Item
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: "No tenant associated with user" });
    }

    // Get item and verify access
    const item = await prisma.invoiceItem.findUnique({
      where: { id },
      include: { invoice: true },
    });

    if (!item || item.invoice.tenantId !== tenantId) {
      return res.status(404).json({ error: "Invoice item not found" });
    }

    await prisma.invoiceItem.delete({
      where: { id },
    });

    // Update invoice total
    const items = await prisma.invoiceItem.findMany({
      where: { invoiceId: item.invoiceId },
    });

    const totalAmount = items.reduce(
      (sum, i) => sum.add(i.amount),
      new Prisma.Decimal(0)
    );

    await prisma.invoice.update({
      where: { id: item.invoiceId },
      data: { amount: totalAmount },
    });

    res.json({ message: "Invoice item deleted successfully" });
  })
);

export default router;
