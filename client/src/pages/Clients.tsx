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
} from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { getApiUrl } from "../config/api";

const API_URL = getApiUrl("/api/clients");

interface Client {
  id: string;
  name: string;
  email: string;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { token } = useAuth(); // Get auth token
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchClients();
    }
  }, [token]);

  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Status: ${res.status}`);
      }

      const responseData = await res.json();
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
      const response = await fetch(API_URL, {
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
      setForm({ name: "", email: "" });
    } catch (error) {
      console.error("Error creating client:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create client"
      );
    }
  };

  const handleEdit = (client: Client) => {
    setCurrentClient(client);
    setForm({ name: client.name, email: client.email });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!currentClient) return;

    try {
      const response = await fetch(`${API_URL}/${currentClient.id}`, {
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
      setForm({ name: "", email: "" });
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
      const response = await fetch(`${API_URL}/${currentClient.id}`, {
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
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client, index) => (
                <TableRow key={client.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
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
      <Dialog open={open} onClose={() => setOpen(false)}>
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
    </Container>
  );
};

export default Clients;
