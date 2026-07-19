import { Link as RouterLink } from "react-router-dom";
import { Button, Container, Paper, Typography } from "@mui/material";

export function NotFoundPage() {
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: "center" }}>
        {/* Paper's sx.textAlign cascades to children; Typography no longer accepts textAlign as a direct prop in this MUI version. */}
        <Typography variant="h3" gutterBottom>
          404
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          The page you're looking for doesn't exist.
        </Typography>
        <Button component={RouterLink} to="/app" variant="contained">
          Back to Dashboard
        </Button>
      </Paper>
    </Container>
  );
}
