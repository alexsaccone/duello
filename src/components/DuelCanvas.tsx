import React, { useState } from 'react';
import { Stage, Layer, Circle, Line, Text, Group, Rect } from 'react-konva';
import { CanvasMove, Point, GuessedArea } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GUESS_AREA_RADIUS, GUESS_AREA_SPRITE_BANK_RADIUS } from '../constants';

interface DuelCanvasProps {
  pointSource: Point;
  onSubmitMove: (move: CanvasMove) => void;
  canSubmit: boolean;
}

interface DraggedSprite {
  type: 'king' | 'guessedArea';
  id: string;
}

const SPRITE_BANK_HEIGHT = 120;
const TOTAL_HEIGHT = CANVAS_HEIGHT + SPRITE_BANK_HEIGHT;

const DuelCanvas: React.FC<DuelCanvasProps> = ({ pointSource, onSubmitMove, canSubmit }) => {
  const [kingPosition, setKingPosition] = useState<Point | null>(null);
  const [guessedArea, setGuessedArea] = useState<GuessedArea | null>(null);
  const [draggedSprite, setDraggedSprite] = useState<DraggedSprite | null>(null);
  const [isDragging, setIsDragging] = useState(false);


  // Sprite bank positions
  const spriteBank = {
    y: CANVAS_HEIGHT + 10,
    king: { x: 100, y: CANVAS_HEIGHT + 60 },
    guessedArea: { x: 300, y: CANVAS_HEIGHT + 60 }
  };

  const handleKingDragStart = () => {
    setDraggedSprite({ type: 'king', id: 'king' });
    setIsDragging(true);
  };

  const handleKingDragEnd = (e: any) => {
    const pos = e.target.position();

    // Check if dropped in canvas area
    if (pos.y < CANVAS_HEIGHT && pos.x >= 0 && pos.x <= CANVAS_WIDTH) {
      setKingPosition({ x: pos.x, y: pos.y });
    } else {
      // Snap back to sprite bank if dropped outside canvas
      e.target.position(spriteBank.king);
      if (kingPosition) {
        setKingPosition(null);
      }
    }

    setDraggedSprite(null);
    setIsDragging(false);
  };

  const handleGuessedAreaDragStart = () => {
    setDraggedSprite({ type: 'guessedArea', id: 'guessedArea' });
    setIsDragging(true);
  };

  const handleGuessedAreaDragEnd = (e: any) => {
    const pos = e.target.position();

    // Check if dropped in canvas area
    if (pos.y < CANVAS_HEIGHT && pos.x >= 0 && pos.x <= CANVAS_WIDTH) {
      setGuessedArea({
        center: { x: pos.x, y: pos.y },
        radius: GUESS_AREA_RADIUS
      });
    } else {
      // Snap back to sprite bank if dropped outside canvas
      e.target.position(spriteBank.guessedArea);
      if (guessedArea) {
        setGuessedArea(null);
      }
    }

    setDraggedSprite(null);
    setIsDragging(false);
  };

  const handleCanvasMove = () => {
    if (!kingPosition || !guessedArea) {
      alert('Please place both your king and guessed area on the canvas!');
      return;
    }

    const move: CanvasMove = {
      kingPosition,
      guessedArea
    };

    onSubmitMove(move);
  };

  const drawKing = (x: number, y: number, isPlaced: boolean) => (
    <Group
      x={x}
      y={y}
      draggable={!isDragging || draggedSprite?.type === 'king'}
      onDragStart={handleKingDragStart}
      onDragEnd={handleKingDragEnd}
    >
      {/* King represented as black X */}
      <Line
        points={[-10, -10, 10, 10]}
        stroke="black"
        strokeWidth={4}
        lineCap="round"
      />
      <Line
        points={[-10, 10, 10, -10]}
        stroke="black"
        strokeWidth={4}
        lineCap="round"
      />
      {!isPlaced && (
        <Text
          text="King"
          x={-15}
          y={15}
          fontSize={12}
          fill="black"
        />
      )}
    </Group>
  );

  const drawGuessedArea = (x: number, y: number, radius: number, isPlaced: boolean) => (
    <Group 
      x={x}
      y={y}
      draggable={!isDragging || draggedSprite?.type === 'guessedArea'}
      onDragStart={handleGuessedAreaDragStart}
      onDragEnd={handleGuessedAreaDragEnd}
    >
      {/* Guessed area represented as red circle */}
      <Circle
        radius={radius}
        stroke="red"
        strokeWidth={3}
        fill="rgba(255, 0, 0, 0.1)"
      />
      {!isPlaced && (
        <Text
          text="Guess Area"
          x={-30}
          y={radius + 10}
          fontSize={12}
          fill="red"
        />
      )}
    </Group>
  );


  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white border-2 border-gray-300 rounded-lg">
        <Stage width={CANVAS_WIDTH} height={TOTAL_HEIGHT} {...({} as any)}>
          <Layer>
            {/* Canvas background with radial gradient */}
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              fillRadialGradientStartPoint={{ x: pointSource.x, y: pointSource.y }}
              fillRadialGradientEndPoint={{ x: pointSource.x, y: pointSource.y }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT) * 1.5}
              fillRadialGradientColorStops={[
                0, 'rgba(0, 255, 0, 1)',
                0.02, 'rgba(0, 220, 0, 0.9)',
                0.08, 'rgba(0, 180, 0, 0.7)',
                0.20, 'rgba(0, 140, 0, 0.4)',
                0.40, 'rgba(0, 100, 0, 0.2)',
                0.60, 'rgba(0, 60, 0, 0.1)',
                0.80, 'rgba(240, 250, 240, 0.8)',
                1, 'rgba(255, 255, 255, 1)'
              ]}
            />

            {/* Canvas border */}
            <Line
              points={[0, 0, CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, CANVAS_HEIGHT, 0, 0]}
              stroke="gray"
              strokeWidth={2}
              closed
            />

            {/* Point source - yellow circle */}
            <Circle
              x={pointSource.x}
              y={pointSource.y}
              radius={8}
              fill="yellow"
              stroke="orange"
              strokeWidth={2}
            />
            <Text
              text="Target"
              x={pointSource.x - 20}
              y={pointSource.y + 15}
              fontSize={12}
              fill="orange"
            />

            {/* Placed King */}
            {kingPosition && drawKing(kingPosition.x, kingPosition.y, true)}

            {/* Placed Guessed Area */}
            {guessedArea && drawGuessedArea(guessedArea.center.x, guessedArea.center.y, GUESS_AREA_RADIUS, true)}

            {/* Sprite Bank Background */}
            <Line
              points={[0, CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_WIDTH, TOTAL_HEIGHT, 0, TOTAL_HEIGHT, 0, CANVAS_HEIGHT]}
              fill="lightgray"
              stroke="gray"
              strokeWidth={1}
              closed
            />

            <Text
              text="Sprite Bank - Drag to Canvas"
              x={20}
              y={CANVAS_HEIGHT + 20}
              fontSize={16}
              fill="black"
              fontStyle="bold"
            />

            {/* Sprite Bank - King */}
            {!kingPosition && drawKing(spriteBank.king.x, spriteBank.king.y, false)}

            {/* Sprite Bank - Guessed Area */}
            {!guessedArea && drawGuessedArea(spriteBank.guessedArea.x, spriteBank.guessedArea.y, GUESS_AREA_SPRITE_BANK_RADIUS, false)}
          </Layer>
        </Stage>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={handleCanvasMove}
          disabled={!canSubmit || !kingPosition || !guessedArea}
          className={`px-6 py-2 rounded-md font-medium ${
            canSubmit && kingPosition && guessedArea
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
        >
          Submit Move
        </button>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600 max-w-md text-center">
        <p className="mb-2">
          <strong>How to play:</strong>
        </p>
        <p className="mb-1">1. Drag your King (X) and Guess Area (red circle) from the sprite bank to the canvas</p>
        <p className="mb-1">2. Place your King close to the yellow target to score points</p>
        <p className="mb-1">3. Use your Guess Area to try to capture your opponent's King</p>
        <p>4. If your King is captured, you get 0 points. Otherwise, closer to target = more points!</p>
      </div>
    </div>
  );
};

export default DuelCanvas;