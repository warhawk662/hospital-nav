import { Analytics } from '@vercel/analytics/react';
import IndoorMap from './components/IndoorMap';

function App() {
  return (
    <div className="App">
      <IndoorMap />
      <Analytics />
    </div>
  );
}

export default App;