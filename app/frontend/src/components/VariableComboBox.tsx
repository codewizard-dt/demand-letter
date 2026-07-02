import { useState } from 'react';

interface VariableComboBoxProps {
  variables: string[];
  onAdd: (varName: string) => void;
  placeholder?: string;
}

export function VariableComboBox({
  variables,
  onAdd,
  placeholder = 'Search or add variable…',
}: VariableComboBoxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? variables.filter((v) => v.toLowerCase().includes(trimmed))
    : variables;
  const exactMatch = variables.some((v) => v.toLowerCase() === trimmed);
  const showAddNew = trimmed.length > 0 && !exactMatch;

  function handleSelect(varName: string) {
    onAdd(varName);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
        onFocus={() => { setOpen(true); }}
        onClick={() => { setOpen(true); }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => { setOpen(false); }, 150)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            setQuery('');
          }
        }}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-max min-w-full rounded border border-gray-200 bg-blue-50 shadow-lg">
          {variables.length === 0 && query.trim() === '' && (
            <div className="px-3 py-2 text-sm text-gray-400 italic">
              No variables yet — type to add one
            </div>
          )}
          {filtered.map((varName) => (
            <div
              key={varName}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-blue-100 cursor-pointer"
              onClick={() => { handleSelect(varName); }}
            >
              <span className="font-mono text-blue-700">{`{${varName}}`}</span>
            </div>
          ))}
          {showAddNew && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50 cursor-pointer"
              onClick={() => { handleSelect(query.trim()); }}
            >
              {`+ Add "${query.trim()}" as new variable`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
