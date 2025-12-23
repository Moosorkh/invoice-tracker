import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

interface Loan {
  id: string;
  loanNumber: string;
  principal: string;
  interestRate: string;
  termMonths: number;
  status: string;
  startDate: string;
  maturityDate: string;
  nextDueDate: string | null;
  totalPaid: string;
  description: string | null;
  client: {
    name: string;
    email: string;
  };
  schedule: Array<{
    id: string;
    dueDate: string;
    principalDue: string;
    interestDue: string;
    totalDue: string;
    paidPrincipal: string;
    paidInterest: string;
    status: string;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    notes: string | null;
    createdAt: string;
  }>;
}

const LoanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    method: "bank_transfer",
    notes: "",
  });

  useEffect(() => {
    if (token && id) {
      fetchLoan();
    }
  }, [token, id]);

  const fetchLoan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/loans/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`);
      }

      const data = await res.json();
      setLoan(data);
    } catch (error) {
      console.error("Error fetching loan:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load loan"
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!loan) return;

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          loanId: loan.id,
          amount: paymentForm.amount,
          method: paymentForm.method,
          notes: paymentForm.notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to record payment");
      }

      setPaymentDialogOpen(false);
      setPaymentForm({ amount: 0, method: "bank_transfer", notes: "" });
      fetchLoan();
    } catch (error) {
      console.error("Error recording payment:", error);
      setError(
        error instanceof Error ? error.message : "Failed to record payment"
      );
    }
  };

  const getScheduleStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "success";
      case "partial":
        return "warning";
      case "overdue":
        return "error";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error || !loan) {
    return (
      <Container>
        <Typography color="error">{error || "Loan not found"}</Typography>
        <Button onClick={() => navigate("/loans")}>Back to Loans</Button>
      </Container>
    );
  }

  const principal = parseFloat(loan.principal);
  const totalPaid = parseFloat(loan.totalPaid);
  const remainingBalance = principal - totalPaid;

  return (
    <Container>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4">{loan.loanNumber}</Typography>
        <Box>
          <Button onClick={() => setPaymentDialogOpen(true)} variant="contained" sx={{ mr: 1 }}>
            Record Payment
          </Button>
          <Button onClick={() => navigate("/loans")}>Back</Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Loan Details
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Client:</strong> {loan.client.name}</Typography>
              <Typography><strong>Principal:</strong> ${parseFloat(principal as any).toFixed(2)}</Typography>
              <Typography><strong>Interest Rate:</strong> {parseFloat(loan.interestRate as any).toFixed(2)}%</Typography>
              <Typography><strong>Term:</strong> {loan.termMonths} months</Typography>
              <Typography><strong>Status:</strong> <Chip label={loan.status.toUpperCase()} size="small" /></Typography>
              <Typography><strong>Start Date:</strong> {new Date(loan.startDate).toLocaleDateString()}</Typography>
              <Typography><strong>Maturity Date:</strong> {new Date(loan.maturityDate).toLocaleDateString()}</Typography>
              {loan.description && <Typography><strong>Description:</strong> {loan.description}</Typography>}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Summary
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography><strong>Total Paid:</strong> ${parseFloat(totalPaid as any).toFixed(2)}</Typography>
              <Typography><strong>Remaining Balance:</strong> ${parseFloat(remainingBalance as any).toFixed(2)}</Typography>
              <Typography><strong>Next Due Date:</strong> {loan.nextDueDate ? new Date(loan.nextDueDate).toLocaleDateString() : "N/A"}</Typography>
              <Typography><strong>Payments Made:</strong> {loan.payments.length}</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment Schedule
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Due Date</TableCell>
                <TableCell>Principal Due</TableCell>
                <TableCell>Interest Due</TableCell>
                <TableCell>Total Due</TableCell>
                <TableCell>Paid Principal</TableCell>
                <TableCell>Paid Interest</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loan.schedule.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{new Date(item.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>${parseFloat(item.principalDue).toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(item.interestDue).toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(item.totalDue).toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(item.paidPrincipal).toFixed(2)}</TableCell>
                  <TableCell>${parseFloat(item.paidInterest).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.status.toUpperCase()}
                      color={getScheduleStatusColor(item.status) as any}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Payment History
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loan.payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No payments recorded
                  </TableCell>
                </TableRow>
              ) : (
                loan.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>${parseFloat(payment.amount).toFixed(2)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{payment.notes || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)}>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={paymentForm.amount === 0 ? "" : paymentForm.amount}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })
            }
            margin="dense"
            required
          />

          <FormControl fullWidth margin="dense">
            <InputLabel>Payment Method</InputLabel>
            <Select
              value={paymentForm.method}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, method: e.target.value })
              }
              label="Payment Method"
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="credit_card">Credit Card</MenuItem>
              <MenuItem value="debit_card">Debit Card</MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="check">Check</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Notes"
            value={paymentForm.notes}
            onChange={(e) =>
              setPaymentForm({ ...paymentForm, notes: e.target.value })
            }
            margin="dense"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={paymentForm.amount <= 0}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LoanDetail;
