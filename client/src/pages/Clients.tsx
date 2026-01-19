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
  IconButton,
  Tooltip,
  DialogContentText,
  Box,
  Chip,
} from "@mui/material";
import { Edit, Delete, LockReset } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../config/api";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type?: string;
  businessName?: string;
  city?: string;
  state?: string;
  status?: string;
  portalUsers?: { id: string; email: string }[];
}

interface PortalUserDialogState {
  open: boolean;
  clientId: string | null;
  clientName: string;
  portalUsers: { id: string; email: string }[];
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ 
    name: "", 
    email: "",
    phone: "",
    type: "individual",
    businessName: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { token, tenantSlug } = useAuth();
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [portalDialog, setPortalDialog] = useState<PortalUserDialogState>({
    open: false,
    clientId: null,
    clientName: "",
    portalUsers: [],
  });
  const [portalEmail, setPortalEmail] = useState("");
  const [portalName, setPortalName] = useState("");

  useEffect(() => {
    console.log('Clients component mounted, token:', !!token);
    if (token) {
      fetchClients();
    }
  }, [token]);

  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const url = getApiUrl("/api/clients");
      console.log('Fetching clients from:', url);
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error response:', errorText);
        throw new Error(`Status: ${res.status} - ${errorText}`);
      }

      const responseData = await res.json();
      console.log('Received data:', responseData);
      // Handle new API response format { data: [], total: 0 }
      const data = responseData.data || responseData;
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError("Failed to load clients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const response = await fetch(getApiUrl("/api/clients"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create client");
      }

      fetchClients();
      setOpen(false);
      // Reset form
      setForm({ 
        name: "", 
        email: "",
        phone: "",
        type: "individual",
        businessName: "",
        city: "",
        state: "",
        zipCode: "",
      });
    } catch (error) {
      console.error("Error creating client:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create client"
      );
    }
  };

  const handleEdit = (client: Client) => {
    setCurrentClient(client);
    setForm({ 
      name: client.name, 
      email: client.email,
      phone: client.phone || "",
      type: client.type || "individual",
      businessName: client.businessName || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: "",
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentClient) return;

    try {
      const response = await fetch(getApiUrl(`/api/clients/${currentClient.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update client");
      }

      fetchClients();
      setEditOpen(false);
      setForm({ 
        name: "", 
        email: "",
        phone: "",
        type: "individual",
        businessName: "",
        city: "",
        state: "",
        zipCode: "",
      });
    } catch (error) {
      console.error("Error updating client:", error);
      setError(
        error instanceof Error ? error.message : "Failed to update client"
      );
    }
  };

  const handleDeleteConfirm = (client: Client) => {
    setCurrentClient(client);
    setDialogError(null); // Reset dialog error when opening
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!currentClient) return;

    try {
      const response = await fetch(getApiUrl(`/api/clients/${currentClient.id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        // throw new Error(errorData.error || "Failed to delete client");
        setDialogError(errorData.error);
        return;
      }

      fetchClients();
      setDeleteOpen(false);
    } catch (error) {
      console.error("Error deleting client:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete client"
      );
    }
  };

  const handleOpenPortalDialog = async (client: Client) => {
    try {
      const res = await fetch(getApiUrl(`/api/clients/${client.id}/portal-users`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPortalDialog({
        open: true,
        clientId: client.id,
        clientName: client.name,
        portalUsers: Array.isArray(data) ? data : [],
      });
      setPortalEmail("");
      setPortalPassword("");
      setPortalName(client.name); // Default to client name
    } catch (error) {
      console.error("Error fetching portal users:", error);
    }
  };

  const handleCreatePortalUser = async () => {
    if (!portalEmail || !portalDialog.clientId) {
      alert("Email is required");
      return;
    }
    
    try {
      const res = await fetch(getApiUrl(`/api/clients/${portalDialog.clientId}/portal-user/invite`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          email: portalEmail,
          name: portalName || portalDialog.clientName,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to send invite");
        return;
      }
      
      const result = await res.json();
      
      // Show success message with invite link
      alert(`✅ Invite sent successfully!\n\n🔗 Invite Link (expires in 7 days):\n${result.inviteUrl}\n\n👉 Share this link with your borrower to set their password.`);
      
      // Reset form
      setPortalEmail("");
      setPortalName("");
      
      // Refresh the portal users list
      handleOpenPortalDialog({ id: portalDialog.clientId, name: portalDialog.clientName, email: "" });
    } catch (error) {
      console.error("Error sending invite:", error);
      alert("Failed to send invite");
    }
  };

  const handleResetPassword = async (portalUserId: string) => {
    if (!portalDialog.clientId) return;
    
    try {
      const res = await fetch(getApiUrl(`/api/clients/${portalDialog.clientId}/portal-users/${portalUserId}/reset-password`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to send reset link");
        return;
      }
      
      const result = await res.json();
      
      // Show success message with reset link
      alert(`✅ Password reset link sent!\n\n🔗 Reset Link (expires in 1 hour):\n${result.resetUrl}\n\n👉 Share this link with your borrower to reset their password.`);
    } catch (error) {
      console.error("Error sending reset link:", error);
      alert("Failed to send reset link");
    }
  };

  const handleDeletePortalUser = async (portalUserId: string) => {
    if (!portalDialog.clientId || !confirm("Remove portal access for this user?")) return;
    try {
      await fetch(getApiUrl(`/api/clients/${portalDialog.clientId}/portal-users/${portalUserId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      handleOpenPortalDialog({ id: portalDialog.clientId, name: portalDialog.clientName, email: "" });
    } catch (error) {
      console.error("Error deleting portal user:", error);
    }
  };

  console.log('Clients component render - loading:', loading, 'error:', error, 'clients:', clients.length);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Clients
      </Typography>
      {error && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: "#ffebee" }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        New Client
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Portal Access</TableCell>
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
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client, index) => (
                <TableRow key={client.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {client.type === 'business' && client.businessName ? (
                      <div>
                        <div>{client.businessName}</div>
                        <Typography variant="caption" color="textSecondary">
                          {client.name}
                        </Typography>
                      </div>
                    ) : (
                      client.name
                    )}
                  </TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {client.type === 'business' ? 'Business' : 'Individual'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {client.city && client.state ? `${client.city}, ${client.state}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleOpenPortalDialog(client)}
                    >
                      Manage
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleEdit(client)}>
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => handleDeleteConfirm(client)}>
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

      {/* Create Client Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>New Client</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            margin="dense"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            margin="dense"
            required
          />
          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            margin="dense"
          />
          <TextField
            select
            fullWidth
            label="Type"
            name="type"
            value={form.type}
            onChange={handleChange as any}
            margin="dense"
            SelectProps={{ native: true }}
          >
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </TextField>
          {form.type === "business" && (
            <TextField
              fullWidth
              label="Business Name"
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              margin="dense"
            />
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              margin="dense"
              sx={{ flex: 1 }}
            />
            <TextField
              label="State"
              name="state"
              value={form.state}
              onChange={handleChange}
              margin="dense"
              sx={{ width: 100 }}
            />
            <TextField
              label="ZIP"
              name="zipCode"
              value={form.zipCode}
              onChange={handleChange}
              margin="dense"
              sx={{ width: 120 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSubmit}
            disabled={!form.name || !form.email}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            margin="dense"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            margin="dense"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpdate}
            disabled={!form.name || !form.email}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>
          {dialogError ? "Cannot Delete Client" : "Confirm Delete"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            sx={{ color: dialogError ? "error.main" : "inherit" }}
          >
            {dialogError ||
              `Are you sure you want to delete the client "${currentClient?.name}"? This action cannot be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {dialogError ? "OK" : "Cancel"}
          </Button>
          {!dialogError && (
            <Button variant="contained" color="error" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Portal User Management Dialog */}
      <Dialog open={portalDialog.open} onClose={() => setPortalDialog({ ...portalDialog, open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Portal Access - {portalDialog.clientName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Send an invite link to your borrower. They'll set their own password.
          </Typography>
          <Box sx={{ mb: 2 }}>
            <TextField
              label="Name"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
              placeholder="Borrower's full name"
            />
            <TextField
              label="Email"
              type="email"
              value={portalEmail}
              onChange={(e) => setPortalEmail(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
              placeholder="borrower@example.com"
            />
            <Button
              variant="contained"
              onClick={handleCreatePortalUser}
              fullWidth
              sx={{ mt: 1 }}
              disabled={!portalEmail}
            >
              Send Invite
            </Button>
          </Box>
          {portalDialog.portalUsers.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                Existing Portal Users:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Email</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {portalDialog.portalUsers.map((pu) => (
                      <TableRow key={pu.id}>
                        <TableCell>{pu.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={pu.status} 
                            size="small" 
                            color={pu.status === 'active' ? 'success' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Reset Password">
                            <IconButton size="small" onClick={() => handleResetPassword(pu.id)}>
                              <LockReset fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => handleDeletePortalUser(pu.id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
          {portalDialog.portalUsers.length === 0 && (
            <Typography color="textSecondary">No portal users yet</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPortalDialog({ ...portalDialog, open: false })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Clients;
