import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function Invoices() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Invoices for {slug}
      </Typography>
      <Typography>
        Invoices page - needs conversion from Next.js
      </Typography>
    </Container>
  );
}
