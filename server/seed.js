const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    // Create test user with hashed password
    const hashedPassword = await bcrypt.hash("password123", 10);
    const user = await prisma.user.create({
        data: {
            email: "user@example.com",
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
            status: "pending",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            description: "Website development services"
        }
    });
    console.log("Created invoice:", invoice);

    // Create test payment
    const payment = await prisma.payment.create({
        data: {
            invoiceId: invoice.id,
            amount: 500.00,
            method: "bank_transfer",
            notes: "Initial payment"
        }
    });
    console.log("Created payment:", payment);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
