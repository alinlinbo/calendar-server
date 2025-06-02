module.exports = (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Calendar PDF Server is running (HTML Template Mode)',
    timestamp: new Date().toISOString()
  });
}; 