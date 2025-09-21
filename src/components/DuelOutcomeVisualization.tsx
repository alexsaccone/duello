import React from 'react';
import { Stage, Layer, Circle, Line, Text, Group } from 'react-konva';
import { CanvasMove, Point } from '../types';
import { GUESS_AREA_RADIUS } from '../constants';

interface DuelOutcomeVisualizationProps {
  fromUserMove: CanvasMove | null;
  toUserMove: CanvasMove | null;
  pointSource: Point;
  currentUserId: string;
  fromUserId: string;
  fromUsername: string;
  toUsername: string;
}

// Smaller canvas for visualization
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 300;
const SCALED_GUESS_RADIUS = GUESS_AREA_RADIUS * 0.5; // Scale down for smaller canvas

const DuelOutcomeVisualization: React.FC<DuelOutcomeVisualizationProps> = ({
  fromUserMove,
  toUserMove,
  pointSource,
  currentUserId,
  fromUserId,
  fromUsername,
  toUsername
}) => {
  // Scale coordinates from original canvas to visualization canvas
  const scalePoint = (point: Point): Point => ({
    x: (point.x / 800) * CANVAS_WIDTH,
    y: (point.y / 600) * CANVAS_HEIGHT
  });

  const scaledPointSource = scalePoint(pointSource);

  // Determine which move belongs to current user vs opponent
  const isCurrentUserFromUser = currentUserId === fromUserId;
  const userMove = isCurrentUserFromUser ? fromUserMove : toUserMove;
  const opponentMove = isCurrentUserFromUser ? toUserMove : fromUserMove;
  const opponentUsername = isCurrentUserFromUser ? toUsername : fromUsername;

  const drawKing = (x: number, y: number, isUser: boolean) => (
    <Group x={x} y={y}>
      {/* King represented as X - different colors for user vs opponent */}
      <Line
        points={[-8, -8, 8, 8]}
        stroke={isUser ? "blue" : "red"}
        strokeWidth={3}
        lineCap="round"
      />
      <Line
        points={[-8, 8, 8, -8]}
        stroke={isUser ? "blue" : "red"}
        strokeWidth={3}
        lineCap="round"
      />
    </Group>
  );

  const drawGuessedArea = (x: number, y: number, radius: number, isUser: boolean) => (
    <Group x={x} y={y}>
      {/* Guessed area represented as circle - different colors for user vs opponent */}
      <Circle
        radius={radius}
        stroke={isUser ? "blue" : "red"}
        strokeWidth={2}
        fill={isUser ? "rgba(0, 0, 255, 0.1)" : "rgba(255, 0, 0, 0.1)"}
      />
    </Group>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Duel Visualization</h4>
        <div className="flex justify-between text-xs text-gray-600">
          <span className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
            Your moves
          </span>
          <span className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
            @{opponentUsername}'s moves
          </span>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="bg-white border border-gray-300 rounded">
          <Stage width={CANVAS_WIDTH} height={CANVAS_HEIGHT} {...({} as any)}>
            <Layer>
              {/* Canvas background */}
              <Circle
                x={0}
                y={0}
                radius={CANVAS_WIDTH * 2}
                fill="white"
              />

              {/* Canvas border */}
              <Line
                points={[0, 0, CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, CANVAS_HEIGHT, 0, 0]}
                stroke="gray"
                strokeWidth={1}
                closed
              />

              {/* Point source - yellow target */}
              <Circle
                x={scaledPointSource.x}
                y={scaledPointSource.y}
                radius={6}
                fill="yellow"
                stroke="orange"
                strokeWidth={2}
              />
              <Text
                text="Target"
                x={scaledPointSource.x - 15}
                y={scaledPointSource.y + 10}
                fontSize={10}
                fill="orange"
              />

              {/* User's moves */}
              {userMove && (
                <>
                  {/* User's King */}
                  {drawKing(
                    scalePoint(userMove.kingPosition).x,
                    scalePoint(userMove.kingPosition).y,
                    true
                  )}

                  {/* User's Guessed Area */}
                  {drawGuessedArea(
                    scalePoint(userMove.guessedArea.center).x,
                    scalePoint(userMove.guessedArea.center).y,
                    SCALED_GUESS_RADIUS,
                    true
                  )}
                </>
              )}

              {/* Opponent's moves */}
              {opponentMove && (
                <>
                  {/* Opponent's King */}
                  {drawKing(
                    scalePoint(opponentMove.kingPosition).x,
                    scalePoint(opponentMove.kingPosition).y,
                    false
                  )}

                  {/* Opponent's Guessed Area */}
                  {drawGuessedArea(
                    scalePoint(opponentMove.guessedArea.center).x,
                    scalePoint(opponentMove.guessedArea.center).y,
                    SCALED_GUESS_RADIUS,
                    false
                  )}
                </>
              )}

              {/* Legend on canvas */}
              <Text
                text="X = King position, ○ = Guess area"
                x={10}
                y={CANVAS_HEIGHT - 20}
                fontSize={9}
                fill="gray"
              />
            </Layer>
          </Stage>
        </div>
      </div>

      {(!userMove || !opponentMove) && (
        <div className="mt-2 text-center text-xs text-gray-500">
          {!userMove && !opponentMove
            ? "No move data available"
            : !userMove
            ? "Your move data missing"
            : "Opponent move data missing"
          }
        </div>
      )}
    </div>
  );
};

export default DuelOutcomeVisualization;