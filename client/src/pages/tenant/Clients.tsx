import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function Clients() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Clients for {slug}
      </Typography>
      <Typography>
        Clients page - needs conversion from Next.js
      </Typography>
    </Container>
  );
}
