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
  Chip,
} from "@mui/material";
import { Visibility, Delete } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "../config/api";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Loan {
  id: string;
  loanNumber: string;
  clientId: string;
  principal: string;
  interestRate: string;
  termMonths: number;
  status: string;
  startDate: string;
  maturityDate: string;
  nextDueDate: string | null;
  totalPaid: string;
  client?: { name: string };
  _count?: { schedule: number; payments: number };
}

const Loans: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    principal: 0,
    interestRate: 0,
    termMonths: 12,
    paymentFrequency: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchLoans();
      fetchClients();
    }
  }, [token]);

  const fetchLoans = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(getApiUrl("/api/loans"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const responseData = await res.json();
      const data = responseData.data || responseData;
      setLoans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching loans:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load loans"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(getApiUrl("/api/clients"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Error: ${res.status}`);

      const responseData = await res.json();
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
        name === "principal" || name === "interestRate"
          ? parseFloat(value) || 0
          : name === "termMonths"
          ? parseInt(value) || 0
          : value,
    });
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const startDate = new Date(form.startDate);
      startDate.setHours(12, 0, 0, 0);

      const response = await fetch(getApiUrl("/api/loans"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          startDate: startDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create loan");
      }

      fetchLoans();
      setOpen(false);
      setForm({
        clientId: "",
        principal: 0,
        interestRate: 0,
        termMonths: 12,
        paymentFrequency: "monthly",
        startDate: new Date().toISOString().split("T")[0],
        description: "",
      });
    } catch (error) {
      console.error("Error creating loan:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create loan"
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this loan?")) return;

    try {
      const response = await fetch(getApiUrl(`/api/loans/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete loan");
      }

      fetchLoans();
    } catch (error) {
      console.error("Error deleting loan:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete loan"
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "closed":
        return "default";
      case "delinquent":
        return "error";
      case "charged_off":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Loans
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
          New Loan
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Loan #</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Principal</TableCell>
              <TableCell>Rate</TableCell>
              <TableCell>Term</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total Paid</TableCell>
              <TableCell>Next Due</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No loans found
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => (
                <TableRow key={loan.id} hover>
                  <TableCell>{loan.loanNumber}</TableCell>
                  <TableCell>
                    {loan.client?.name ||
                      clients.find((c) => c.id === loan.clientId)?.name ||
                      loan.clientId}
                  </TableCell>
                  <TableCell>${parseFloat(loan.principal).toFixed(2)}</TableCell>
                  <TableCell>{parseFloat(loan.interestRate).toFixed(2)}%</TableCell>
                  <TableCell>{loan.termMonths} months</TableCell>
                  <TableCell>
                    <Chip
                      label={loan.status.toUpperCase()}
                      color={getStatusColor(loan.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>${parseFloat(loan.totalPaid).toFixed(2)}</TableCell>
                  <TableCell>
                    {loan.nextDueDate
                      ? new Date(loan.nextDueDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        onClick={() => navigate(`/loans/${loan.id}`)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDelete(loan.id)}>
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

      {/* Create Loan Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Loan</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense" required>
            <InputLabel id="client-select-label">Client</InputLabel>
            <Select
              labelId="client-select-label"
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              label="Client"
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Principal Amount"
            type="number"
            name="principal"
            value={form.principal === 0 ? "" : form.principal}
            onChange={handleChange}
            margin="dense"
            required
          />

          <TextField
            fullWidth
            label="Interest Rate (%)"
            type="number"
            name="interestRate"
            value={form.interestRate === 0 ? "" : form.interestRate}
            onChange={handleChange}
            margin="dense"
            required
            inputProps={{ step: "0.01", min: "0", max: "100" }}
          />

          <TextField
            fullWidth
            label="Term (Months)"
            type="number"
            name="termMonths"
            value={form.termMonths}
            onChange={handleChange}
            margin="dense"
            required
            inputProps={{ min: "1" }}
          />

          <TextField
            fullWidth
            label="Start Date"
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            margin="dense"
            required
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            label="Description"
            name="description"
            value={form.description}
            onChange={handleChange}
            margin="dense"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!form.clientId || form.principal <= 0 || form.termMonths <= 0}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Loans;
