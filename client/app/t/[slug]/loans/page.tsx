'use client';

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
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";

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

export default function Loans() {
  const params = useParams();
  const slug = params.slug as string;
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    productCategory: "personal",
    accrualMethod: "amortizing",
    paymentStructure: "level",
    dayCountConvention: "actual_365",
    principal: 0,
    interestRate: 0,
    rateType: "fixed",
    termMonths: 12,
    paymentFrequency: "monthly",
    amortizationType: "amortizing",
    startDate: new Date().toISOString().split("T")[0],
    interestOnlyMonths: 0,
    balloonAmount: 0,
    graceDays: 10,
    lateFeeAmount: 0,
    lateFeePercent: 0,
    description: "",
    internalNotes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { token } = useAuth();

  useEffect(() => {
    if (token && slug) {
      fetchLoans();
      fetchClients();
    }
  }, [token, slug]);

  const fetchLoans = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/t/${slug}/api/loans`, {
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
      const res = await fetch(`/t/${slug}/api/clients`, {
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

    const floatFields = ["principal", "interestRate", "lateFeeAmount", "lateFeePercent", "balloonAmount"];
    const intFields = ["termMonths", "graceDays", "interestOnlyMonths"];

    setForm({
      ...form,
      [name]:
        floatFields.includes(name)
          ? parseFloat(value) || 0
          : intFields.includes(name)
          ? parseInt(value) || 0
          : value,
    });
  };

  const handleSubmit = async () => {
    setError("");
    
    if (!form.clientId) {
      setError("Please select a client");
      return;
    }
    if (form.principal <= 0) {
      setError("Principal amount must be greater than zero");
      return;
    }
    if (form.interestRate < 0 || form.interestRate > 99.99) {
      setError("Interest rate must be between 0% and 99.99%");
      return;
    }
    if (form.termMonths < 1) {
      setError("Loan term must be at least 1 month");
      return;
    }
    if (form.lateFeePercent && (form.lateFeePercent < 0 || form.lateFeePercent > 100)) {
      setError("Late fee percentage must be between 0% and 100%");
      return;
    }
    
    try {
      const startDate = new Date(form.startDate);
      startDate.setHours(12, 0, 0, 0);

      const response = await fetch(`/t/${slug}/api/loans`, {
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
        throw new Error(errorData.error || "Failed to create loan. Please check your input and try again.");
      }

      fetchLoans();
      setOpen(false);
      setForm({
        clientId: "",
        productCategory: "personal",
        accrualMethod: "amortizing",
        paymentStructure: "level",
        dayCountConvention: "actual_365",
        principal: 0,
        interestRate: 0,
        rateType: "fixed",
        termMonths: 12,
        paymentFrequency: "monthly",
        amortizationType: "amortizing",
        startDate: new Date().toISOString().split("T")[0],
        interestOnlyMonths: 0,
        balloonAmount: 0,
        graceDays: 10,
        lateFeeAmount: 0,
        lateFeePercent: 0,
        description: "",
        internalNotes: "",
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
      const response = await fetch(`/t/${slug}/api/loans/${id}`, {
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
                        onClick={() => router.push(`/t/${slug}/loans/${loan.id}`)}
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

          <FormControl fullWidth margin="dense">
            <InputLabel>Product Category</InputLabel>
            <Select
              name="productCategory"
              value={form.productCategory}
              onChange={handleChange}
              label="Product Category"
            >
              <MenuItem value="mortgage">Mortgage</MenuItem>
              <MenuItem value="heloc">HELOC</MenuItem>
              <MenuItem value="auto">Auto Loan</MenuItem>
              <MenuItem value="personal">Personal Loan</MenuItem>
              <MenuItem value="business">Business Loan</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Accrual Method</InputLabel>
            <Select
              name="accrualMethod"
              value={form.accrualMethod}
              onChange={handleChange}
              label="Accrual Method"
            >
              <MenuItem value="amortizing">Amortizing (Standard)</MenuItem>
              <MenuItem value="simple_daily">Simple Interest (Daily Accrual)</MenuItem>
              <MenuItem value="precomputed">Precomputed Interest</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Payment Structure</InputLabel>
            <Select
              name="paymentStructure"
              value={form.paymentStructure}
              onChange={handleChange}
              label="Payment Structure"
            >
              <MenuItem value="level">Level Payment</MenuItem>
              <MenuItem value="interest_only">Interest Only</MenuItem>
              <MenuItem value="balloon">Balloon</MenuItem>
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

          <FormControl fullWidth margin="dense">
            <InputLabel>Rate Type</InputLabel>
            <Select
              name="rateType"
              value={form.rateType}
              onChange={handleChange}
              label="Rate Type"
            >
              <MenuItem value="fixed">Fixed</MenuItem>
              <MenuItem value="variable">Variable</MenuItem>
            </Select>
          </FormControl>

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

          <FormControl fullWidth margin="dense">
            <InputLabel>Payment Frequency</InputLabel>
            <Select
              name="paymentFrequency"
              value={form.paymentFrequency}
              onChange={handleChange}
              label="Payment Frequency"
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="biweekly">Biweekly</MenuItem>
              <MenuItem value="weekly">Weekly</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Amortization Type</InputLabel>
            <Select
              name="amortizationType"
              value={form.amortizationType}
              onChange={handleChange}
              label="Amortization Type"
            >
              <MenuItem value="amortizing">Amortizing</MenuItem>
              <MenuItem value="interest_only">Interest Only</MenuItem>
              <MenuItem value="balloon">Balloon</MenuItem>
            </Select>
          </FormControl>

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

          {form.paymentStructure === "interest_only" && (
            <TextField
              fullWidth
              label="Interest Only Period (Months)"
              type="number"
              name="interestOnlyMonths"
              value={form.interestOnlyMonths === 0 ? "" : form.interestOnlyMonths}
              onChange={handleChange}
              margin="dense"
              inputProps={{ min: "1" }}
            />
          )}

          {form.paymentStructure === "balloon" && (
            <TextField
              fullWidth
              label="Balloon Amount ($)"
              type="number"
              name="balloonAmount"
              value={form.balloonAmount === 0 ? "" : form.balloonAmount}
              onChange={handleChange}
              margin="dense"
              inputProps={{ min: "0", step: "0.01" }}
            />
          )}

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Grace Days"
              type="number"
              name="graceDays"
              value={form.graceDays}
              onChange={handleChange}
              margin="dense"
              sx={{ flex: 1 }}
              inputProps={{ min: "0", max: "30" }}
            />
            <TextField
              label="Late Fee ($)"
              type="number"
              name="lateFeeAmount"
              value={form.lateFeeAmount === 0 ? "" : form.lateFeeAmount}
              onChange={handleChange}
              margin="dense"
              sx={{ flex: 1 }}
              inputProps={{ min: "0", step: "0.01" }}
            />
            <TextField
              label="Late Fee (%)"
              type="number"
              name="lateFeePercent"
              value={form.lateFeePercent === 0 ? "" : form.lateFeePercent}
              onChange={handleChange}
              margin="dense"
              sx={{ flex: 1 }}
              inputProps={{ min: "0", max: "100", step: "0.01" }}
            />
          </Box>

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

          <TextField
            fullWidth
            label="Internal Notes"
            name="internalNotes"
            value={form.internalNotes}
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
}
