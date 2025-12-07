const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    // Only seed in development
    if (process.env.NODE_ENV === "production") {
        console.log("⏭️  Skipping seed in production");
        return;
    }

    console.log("🌱 Seeding database...");

    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
        data: {
            email: "admin@example.com",
            password: hashedPassword
        }
    });
    console.log("Created user:", user);

    // Create test client
    const client = await prisma.client.create({
        data: {
            name: "Test Client",
            email: "client@example.com",
            phone: "+1234567890",
            address: "123 Main St, City, Country"
        }
    });
    console.log("Created client:", client);

    // Create test invoice
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber: "INV-2025-00001",
            clientId: client.id,
            userId: user.id,
            amount: 1500.00,
            status: "paid",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            description: "Website development services"
        }
    });
    console.log("Created invoice:", invoice);

    // Create test payments that total to the invoice amount
    const payment1 = await prisma.payment.create({
        data: {
            invoiceId: invoice.id,
            amount: 500.00,
            method: "bank_transfer",
            notes: "First installment payment"
        }
    });
    console.log("Created payment 1:", payment1);

    const payment2 = await prisma.payment.create({
        data: {
            invoiceId: invoice.id,
            amount: 500.00,
            method: "bank_transfer",
            notes: "Second installment payment"
        }
    });
    console.log("Created payment 2:", payment2);

    const payment3 = await prisma.payment.create({
        data: {
            invoiceId: invoice.id,
            amount: 500.00,
            method: "cash",
            notes: "Final payment"
        }
    });
    console.log("Created payment 3:", payment3);

    // Create a pending invoice
    const invoice2 = await prisma.invoice.create({
        data: {
            invoiceNumber: "INV-2025-00002",
            clientId: client.id,
            userId: user.id,
            amount: 2500.00,
            status: "pending",
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
            description: "Mobile app development"
        }
    });
    console.log("Created pending invoice:", invoice2);

    // Create an overdue invoice
    const invoice3 = await prisma.invoice.create({
        data: {
            invoiceNumber: "INV-2025-00003",
            clientId: client.id,
            userId: user.id,
            amount: 800.00,
            status: "overdue",
            dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            description: "Logo design services"
        }
    });
    console.log("Created overdue invoice:", invoice3);

    // Add partial payment to pending invoice
    const payment4 = await prisma.payment.create({
        data: {
            invoiceId: invoice2.id,
            amount: 1000.00,
            method: "credit_card",
            notes: "Down payment"
        }
    });
    console.log("Created payment 4:", payment4);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
