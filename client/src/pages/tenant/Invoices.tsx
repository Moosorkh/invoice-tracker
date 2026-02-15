import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  SelectChangeEvent,
  IconButton,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/api";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Invoice {
  id: string;
  clientId: string;
  userId: string;
  amount: number;
  status: string;
  createdAt: string;
  invoiceNumber?: string;
  dueDate?: string;
  description?: string;
  client?: { name: string };
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    amount: 0,
    status: "pending",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  // Get token from auth context
  const { token, tenantSlug: authTenantSlug } = useAuth();
  const tenantSlug =
    authTenantSlug ??
    (typeof window !== "undefined" ? localStorage.getItem("tenantSlug") : null);

  useEffect(() => {
    if (token) {
      fetchInvoices();
      fetchClients();
    }
  }, [token]);

  const fetchInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(getApiUrl("/api/invoices"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Please login to view invoices");
        }
        throw new Error(`Error: ${res.status}`);
      }

      const responseData = await res.json();
      // Handle new API response format { data: [], total: 0 }
      const data = responseData.data || responseData;
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load invoices"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(getApiUrl("/api/clients"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const responseData = await res.json();
      // Handle new API response format { data: [], total: 0 }
      const data = responseData.data || responseData;
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | SelectChangeEvent
  ) => {
    const name = e.target.name as string;
    const value = e.target.value;

    setForm({
      ...form,
      [name]:
        name === "amount" && typeof value === "string"
          ? parseFloat(value)
          : value,
    });
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/invoices"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create invoice");
      }

      fetchInvoices();
      setOpen(false);
      // Reset form
      setForm({
        clientId: "",
        amount: 0,
        status: "pending",
      });
    } catch (error) {
      console.error("Error creating invoice:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create invoice"
      );
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setForm({
      clientId: invoice.clientId,
      amount: invoice.amount,
      status: invoice.status,
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentInvoice) return;

    try {
      const response = await fetch(getApiUrl(`/api/invoices/${currentInvoice.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update invoice");
      }

      fetchInvoices();
      setEditOpen(false);
      // Reset form
      setForm({
        clientId: "",
        amount: 0,
        status: "pending",
      });
    } catch (error) {
      console.error("Error updating invoice:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update invoice"
      );
    }
  };

  const handleDeleteConfirm = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!currentInvoice) return;

    try {
      const response = await fetch(getApiUrl(`/api/invoices/${currentInvoice.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete invoice");
      }

      fetchInvoices();
      setDeleteOpen(false);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete invoice"
      );
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Invoices
      </Typography>
      {error && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: "#ffebee" }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
        >
          New Invoice
        </Button>
        <Button
          variant="outlined"
          color="primary"
          component="a"
          href="/clients"
        >
          Manage Clients
        </Button>

        <TextField
          label="Search invoices..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flexGrow: 1 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            label="Status Filter"
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="paid">Paid</MenuItem>
            <MenuItem value="overdue">Overdue</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No invoices found
                </TableCell>
              </TableRow>
            ) : (
              invoices
                .filter((invoice) => {
                  // Filter by status
                  if (
                    statusFilter !== "all" &&
                    invoice.status !== statusFilter
                  ) {
                    return false;
                  }

                  // Filter by search term
                  if (searchTerm) {
                    const searchLower = searchTerm.toLowerCase();
                    const clientName =
                      invoice.client?.name ||
                      clients.find((c) => c.id === invoice.clientId)?.name ||
                      "";
                    const invoiceNumber = invoice.invoiceNumber || "";

                    return (
                      clientName.toLowerCase().includes(searchLower) ||
                      invoiceNumber.toLowerCase().includes(searchLower)
                    );
                  }

                  return true;
                })
                .map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    hover
                    onClick={() =>
                      navigate(
                        tenantSlug
                          ? `/t/${tenantSlug}/invoices/${invoice.id}`
                          : `/invoices/${invoice.id}`
                      )
                    }
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      {invoice.invoiceNumber || invoice.id.substring(0, 8)}
                    </TableCell>
                    <TableCell>
                      {invoice.client?.name ||
                        clients.find((c) => c.id === invoice.clientId)?.name ||
                        invoice.clientId}
                    </TableCell>
                    <TableCell>${parseFloat(invoice.amount as any).toFixed(2)}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          display: "inline-block",
                          backgroundColor:
                            invoice.status === "paid"
                              ? "#e8f5e9"
                              : invoice.status === "overdue"
                              ? "#ffebee"
                              : "#fff3e0",
                          color:
                            invoice.status === "paid"
                              ? "#2e7d32"
                              : invoice.status === "overdue"
                              ? "#c62828"
                              : "#e65100",
                        }}
                      >
                        {invoice.status.toUpperCase()}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click event
                            handleEdit(invoice);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click event
                            handleDeleteConfirm(invoice);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Invoice Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>New Invoice</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" required>
            <InputLabel id="client-select-label">Client</InputLabel>
            <Select
              labelId="client-select-label"
              id="client-select"
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              label="Client"
            >
              {Array.isArray(clients) &&
                clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount"
            type="number"
            name="amount"
            value={form.amount === 0 ? "" : form.amount}
            onChange={handleChange}
            margin="dense"
            required
          />

          <FormControl fullWidth margin="dense">
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              id="status-select"
              name="status"
              value={form.status}
              onChange={handleChange}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!form.clientId || form.amount <= 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Invoice</DialogTitle>
        <DialogContent>
          {currentInvoice && currentInvoice.amount !== form.amount && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                bgcolor: "#fff3e0",
                borderRadius: 1,
                border: "1px solid #ff9800",
              }}
            >
              <Typography variant="body2" color="warning.dark">
                ⚠️ <strong>Warning:</strong> Changing the invoice amount will
                automatically recalculate the status based on existing payments.
                {currentInvoice.amount > form.amount &&
                  " Reducing the amount may result in an overpayment."}
              </Typography>
            </Box>
          )}

          <FormControl fullWidth margin="dense" required>
            <InputLabel id="edit-client-select-label">Client</InputLabel>
            <Select
              labelId="edit-client-select-label"
              id="edit-client-select"
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              label="Client"
            >
              {Array.isArray(clients) &&
                clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Amount"
            type="number"
            name="amount"
            value={form.amount === 0 ? "" : form.amount}
            onChange={handleChange}
            margin="dense"
            required
          />

          <FormControl fullWidth margin="dense">
            <InputLabel id="edit-status-select-label">Status</InputLabel>
            <Select
              labelId="edit-status-select-label"
              id="edit-status-select"
              name="status"
              value={form.status}
              onChange={handleChange}
              label="Status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="overdue">Overdue</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            disabled={!form.clientId || form.amount <= 0}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this invoice? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Invoices;
