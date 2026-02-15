import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function Loans() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Loans for {slug}
      </Typography>
      <Typography>
        Loans page - needs conversion from Next.js
      </Typography>
    </Container>
  );
}
