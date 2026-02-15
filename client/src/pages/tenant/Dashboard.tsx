import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Dashboard for {slug}
      </Typography>
      <Typography>
        Dashboard page - needs conversion from Next.js
      </Typography>
    </Container>
  );
}
