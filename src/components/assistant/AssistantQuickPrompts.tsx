interface AssistantQuickPromptsProps {
  prompts: readonly string[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

export function AssistantQuickPrompts({ prompts, disabled, onSelect }: AssistantQuickPromptsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {prompts.map(prompt => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-white/45 hover:text-white hover:border-red-500/30 hover:bg-red-500/8 transition-colors disabled:opacity-40"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
