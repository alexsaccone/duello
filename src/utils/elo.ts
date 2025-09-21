// ELO calculation constants
const K_FACTOR = 32; // Max ELO adjustment per game

// Helper function to calculate ELO change
export const calculateEloChange = (playerElo: number, opponentElo: number, outcome: number): number => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(K_FACTOR * (outcome - expectedScore));
};