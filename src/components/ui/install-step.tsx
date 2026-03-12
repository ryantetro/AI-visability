interface InstallStepProps {
  step: number;
  filename: string;
  instructions: string;
}

export function InstallStep({ step, filename, instructions }: InstallStepProps) {
  return (
    <div className="aiso-card-soft flex gap-5 p-6">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center text-base font-bold"
        style={{
          backgroundColor: 'var(--color-primary-50)',
          color: 'var(--color-primary-600)',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 16px rgba(5, 150, 105, 0.12)',
        }}
      >
        {step}
      </div>
      <div>
        <h4 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Install <span className="font-mono text-sm" style={{ color: 'var(--color-primary-600)' }}>{filename}</span>
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{instructions}</p>
      </div>
    </div>
  );
}
