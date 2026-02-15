import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function Billing() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Billing for {slug}
      </Typography>
      <Typography>
        Billing page - needs conversion from Next.js
      </Typography>
    </Container>
  );
}
