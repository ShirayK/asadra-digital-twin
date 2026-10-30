'use client';

/**
 * Placeholder for the Three.js canvas.
 * This component is dynamically imported with ssr:false in subsequent prompts.
 * For now it renders a simple placeholder so the build passes.
 */
export default function TwinCanvas() {
  return (
    <div
      style={{
        width: '100%',
        height: '600px',
        background: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        border: '1px solid #334155',
        color: '#94a3b8',
        fontSize: '1rem',
      }}
    >
      3-D canvas — coming in Prompt 5
    </div>
  );
}
