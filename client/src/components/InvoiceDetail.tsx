import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Button,
  Divider,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { ArrowBack, Payment as PaymentIcon, Add, Edit, Delete } from "@mui/icons-material";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/api";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Payment {
  id: string;
  amount: number;
  method: string;
  createdAt: string;
}

interface InvoiceItem {
  id: string;
  invoiceId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  clientId: string;
  userId: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  invoiceNumber?: string;
  dueDate?: string;
  description?: string;
  client: Client;
  payments: Payment[];
  items?: InvoiceItem[];
}

const InvoiceDetail = () => {
  const params = useParams();
  const id = params?.id as string;
  const navigate = useNavigate();
  const { token } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add payment state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "credit_card",
  });

  // Line items state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<InvoiceItem | null>(null);
  const [itemForm, setItemForm] = useState({
    productName: "",
    quantity: 1,
    unitPrice: 0,
  });
  const [deleteItemOpen, setDeleteItemOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InvoiceItem | null>(null);

  useEffect(() => {
    if (id && token) {
      fetchInvoiceDetails();
    }
  }, [id, token]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/invoices/${id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Invoice not found");
        }
        throw new Error("Error fetching invoice details");
      }

      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent
  ) => {
    const { name, value } = e.target;
    setPaymentForm({
      ...paymentForm,
      [name]:
        name === "amount" && typeof value === "string"
          ? parseFloat(value)
          : value,
    });
  };

  const handleAddPayment = async () => {
    try {
      const response = await fetch(getApiUrl(`/api/payments`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...paymentForm,
          invoiceId: id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add payment");
      }

      // Refresh invoice details to show new payment
      fetchInvoiceDetails();
      setPaymentOpen(false);
      setPaymentForm({
        amount: 0,
        method: "credit_card",
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      setError(
        error instanceof Error ? error.message : "Failed to add payment"
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
      default:
        return "default";
    }
  };

  // Line item handlers
  const handleItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setItemForm({
      ...itemForm,
      [name]:
        name === "quantity" || name === "unitPrice"
          ? parseFloat(value) || 0
          : value,
    });
  };

  const handleAddItem = () => {
    setCurrentItem(null);
    setItemForm({
      productName: "",
      quantity: 1,
      unitPrice: 0,
    });
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: InvoiceItem) => {
    setCurrentItem(item);
    setItemForm({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    });
    setItemDialogOpen(true);
  };

  const handleDeleteItemClick = (item: InvoiceItem) => {
    setItemToDelete(item);
    setDeleteItemOpen(true);
  };

  const handleSaveItem = async () => {
    try {
      const url = getApiUrl(
        currentItem
          ? `/api/invoice-items/${currentItem.id}`
          : `/api/invoice-items`
      );
      const method = currentItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...itemForm,
          invoiceId: id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${currentItem ? "update" : "add"} item`);
      }

      fetchInvoiceDetails();
      setItemDialogOpen(false);
      setCurrentItem(null);
      setItemForm({
        productName: "",
        quantity: 1,
        unitPrice: 0,
      });
    } catch (error) {
      console.error("Error saving item:", error);
      setError(error instanceof Error ? error.message : "Failed to save item");
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(getApiUrl(`/api/invoice-items/${itemToDelete.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete item");
      }

      fetchInvoiceDetails();
      setDeleteItemOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete item"
      );
    }
  };

  // Calculate total payments
  const totalPaid =
    invoice?.payments.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const remainingBalance = invoice ? invoice.amount - totalPaid : 0;

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, bgcolor: "#ffebee" }}>
          <Typography color="error">{error}</Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push("/invoices")}
            sx={{ mt: 2 }}
          >
            Back to Invoices
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography>Invoice not found</Typography>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/invoices")}
            sx={{ mt: 2 }}
          >
            Back to Invoices
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/invoices")}
        sx={{ mb: 2 }}
      >
        Back to Invoices
      </Button>

      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4">Invoice Details</Typography>
          <Chip
            label={invoice.status.toUpperCase()}
            color={getStatusColor(invoice.status)}
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Invoice ID
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.invoiceNumber || invoice.id.substring(0, 8)}
            </Typography>

            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ mt: 2 }}
            >
              Date Created
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(invoice.createdAt).toLocaleDateString()}
            </Typography>

            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ mt: 2 }}
            >
              Due Date
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.dueDate
                ? new Date(invoice.dueDate).toLocaleDateString()
                : "Not set"}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Client
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.client.name}
            </Typography>

            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ mt: 2 }}
            >
              Client Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {invoice.client.email}
            </Typography>

            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ mt: 2 }}
            >
              Amount
            </Typography>
            <Typography variant="body1" gutterBottom>
              ${parseFloat(invoice.amount as any).toFixed(2)}
            </Typography>
          </Grid>

          {invoice.description && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary">
                Description
              </Typography>
              <Typography variant="body1">{invoice.description}</Typography>
            </Grid>
          )}
        </Grid>

        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="h6">Payment Summary</Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e3f2fd" }}>
                <Typography variant="subtitle2">Total Amount</Typography>
                <Typography variant="h6">
                  ${parseFloat(invoice.amount as any).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e9" }}>
                <Typography variant="subtitle2">Paid</Typography>
                <Typography variant="h6">${parseFloat(totalPaid as any).toFixed(2)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: remainingBalance > 0 ? "#fff3e0" : "#e8f5e9",
                }}
              >
                <Typography variant="subtitle2">Balance</Typography>
                <Typography variant="h6">
                  ${parseFloat(remainingBalance as any).toFixed(2)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Line Items Section */}
        <Box sx={{ mt: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Line Items</Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddItem}
            >
              Add Item
            </Button>
          </Box>

          {!invoice.items || invoice.items.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center", bgcolor: "#f5f5f5" }}>
              <Typography variant="body2" color="textSecondary">
                No line items added yet. Click "Add Item" to get started.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product/Service</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.productName}</TableCell>
                      <TableCell align="right">{item.quantity}</TableCell>
                      <TableCell align="right">
                        ${parseFloat(item.unitPrice as any).toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        ${parseFloat(item.amount as any).toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEditItem(item)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<Delete />}
                          onClick={() => handleDeleteItemClick(item)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Total:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        ${parseFloat(invoice.amount as any).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Box sx={{ mt: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6">Payment History</Typography>
            {remainingBalance > 0 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PaymentIcon />}
                onClick={() => setPaymentOpen(true)}
              >
                Add Payment
              </Button>
            )}
          </Box>

          {invoice.payments.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No payments recorded yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>
                        {payment.method.replace("_", " ")}
                      </TableCell>
                      <TableCell align="right">
                        ${parseFloat(payment.amount as any).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            name="amount"
            value={paymentForm.amount === 0 ? "" : paymentForm.amount}
            onChange={handlePaymentChange}
            margin="dense"
            required
            inputProps={{ max: remainingBalance }}
            helperText={`Maximum payment: $${parseFloat(remainingBalance as any).toFixed(2)}`}
          />

          <FormControl fullWidth margin="dense">
            <InputLabel id="payment-method-label">Payment Method</InputLabel>
            <Select
              labelId="payment-method-label"
              name="method"
              value={paymentForm.method}
              onChange={handlePaymentChange}
              label="Payment Method"
            >
              <MenuItem value="credit_card">Credit Card</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="paypal">PayPal</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddPayment}
            disabled={
              paymentForm.amount <= 0 || paymentForm.amount > remainingBalance
            }
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Line Item Dialog */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentItem ? "Edit Line Item" : "Add Line Item"}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Product/Service Name"
            name="productName"
            value={itemForm.productName}
            onChange={handleItemChange}
            margin="dense"
            required
          />
          <TextField
            fullWidth
            label="Quantity"
            type="number"
            name="quantity"
            value={itemForm.quantity === 0 ? "" : itemForm.quantity}
            onChange={handleItemChange}
            margin="dense"
            required
            inputProps={{ min: 1, step: 1 }}
          />
          <TextField
            fullWidth
            label="Unit Price"
            type="number"
            name="unitPrice"
            value={itemForm.unitPrice === 0 ? "" : itemForm.unitPrice}
            onChange={handleItemChange}
            margin="dense"
            required
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Paper sx={{ p: 2, mt: 2, bgcolor: "#f5f5f5" }}>
            <Typography variant="subtitle2" color="textSecondary">
              Calculated Amount:
            </Typography>
            <Typography variant="h6">
              ${(itemForm.quantity * itemForm.unitPrice).toFixed(2)}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveItem}
            disabled={
              !itemForm.productName ||
              itemForm.quantity <= 0 ||
              itemForm.unitPrice <= 0
            }
          >
            {currentItem ? "Update" : "Add"} Item
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Line Item Confirmation Dialog */}
      <Dialog
        open={deleteItemOpen}
        onClose={() => setDeleteItemOpen(false)}
      >
        <DialogTitle>Delete Line Item</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{itemToDelete?.productName}"?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone. The invoice total will be updated
            automatically.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteItemOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteItem}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetail;
