const STEPS = ['Upload', 'Gap Report', 'Generate', 'Editor', 'Done'];

interface Props {
  currentStep: number; // 0-indexed
}

export default function WorkflowStepper({ currentStep }: Props) {
  return (
    <nav aria-label="Workflow progress" className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              active ? 'bg-primary text-white' : done ? 'text-primary' : 'text-text-muted'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${
                active ? 'bg-white text-primary border-white' : done ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-400'
              }`}>
                {done ? '✓' : i + 1}
              </span>
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-px ${i < currentStep ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}
