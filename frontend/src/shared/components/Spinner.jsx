const Spinner = ({ size = 20, fullScreen = false, label }) => {
  const spinner = (
    <div className="spinner-wrap">
      <div className="spinner-ring" style={{ width: size, height: size }} />
      {label && <span className="spinner-label">{label}</span>}
    </div>
  )
  return fullScreen ? <div className="spinner-fullscreen">{spinner}</div> : spinner
}

export default Spinner
