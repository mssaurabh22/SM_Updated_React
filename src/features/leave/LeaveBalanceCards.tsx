import { Box, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import type { LeaveBalance } from "../../api/leaveBalancesApi";

interface LeaveBalanceCardsProps {
  balances: LeaveBalance[];
}

/** Allocated/used/remaining per leave type, shared by MyLeaveRequestsPage and
 * the Employee Leave & Attendance detail page. */
export function LeaveBalanceCards({ balances }: LeaveBalanceCardsProps) {
  if (balances.length === 0) return null;

  return (
    <Grid container spacing={2}>
      {balances.map((balance) => (
        <Grid key={balance.leaveTypeId} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                {balance.leaveTypeName}
              </Typography>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="h6">{balance.allocatedDays}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Allocated
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6">{balance.usedDays}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Used
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6" color="success.main">
                    {balance.remainingDays}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Remaining
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
