interface Props {
  darkMode: boolean;
}

export function Lighting({ darkMode }: Props) {
  const ambientIntensity = darkMode ? 0.4 : 0.6;
  const dirIntensity = darkMode ? 0.6 : 0.8;

  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 20, 10]} intensity={dirIntensity} />
    </>
  );
}
