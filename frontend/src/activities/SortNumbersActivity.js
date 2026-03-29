import React, { useState } from "react";

// Utilitaire pour mélanger un tableau
function shuffle(array) {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SortNumbersActivity = ({ content, onComplete }) => {
  const numbers = content?.numbers || [3, 1, 4, 2, 5];
  const [tiles, setTiles] = useState(shuffle(numbers));
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [finished, setFinished] = useState(false);

  const handleDragStart = (idx) => setDraggedIdx(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (idx) => {
    if (draggedIdx === null) return;
    const newTiles = tiles.slice();
    const [removed] = newTiles.splice(draggedIdx, 1);
    newTiles.splice(idx, 0, removed);
    setTiles(newTiles);
    setDraggedIdx(null);
  };

  const handleValidate = () => {
    const isSorted = tiles.every((n, i, arr) => i === 0 || arr[i - 1] <= n);
    setFinished(true);
    if (onComplete) onComplete(isSorted ? 20 : 0);
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Classe les nombres dans l'ordre croissant</h3>
      <div className="flex gap-4 justify-center mb-6">
        {tiles.map((n, idx) => (
          <div
            key={idx}
            className="w-16 h-16 flex items-center justify-center bg-blue-200 rounded shadow cursor-move text-2xl font-bold select-none transition-transform hover:scale-105"
            draggable={!finished}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(idx)}
            style={{ opacity: finished ? 0.5 : 1 }}
          >
            {n}
          </div>
        ))}
      </div>
      {!finished && (
        <button
          className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
          onClick={handleValidate}
        >
          Valider
        </button>
      )}
      {finished && (
        <p className="mt-4 text-center text-lg font-medium text-gray-700">
          {tiles.every((n, i, arr) => i === 0 || arr[i - 1] <= n)
            ? "Bravo, c'est correct !"
            : "Ce n'est pas l'ordre croissant."}
        </p>
      )}
    </div>
  );
};

export default SortNumbersActivity;
