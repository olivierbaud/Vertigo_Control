import { useEffect, useState } from 'react';
import { guiAPI } from '../utils/api';

// This is a simplified renderer. In a real-world scenario, this would be
// much more complex, handling various component types, layouts, and styles.

const renderElement = (element) => {
  const style = {
    position: 'absolute',
    left: `${element.position.x}px`,
    top: `${element.position.y}px`,
    width: `${element.position.width}px`,
    height: `${element.position.height}px`,
  };

  switch (element.type) {
    case 'button':
      return (
        <button key={element.id} style={style} className="bg-blue-500 text-white rounded shadow p-2">
          {element.label}
        </button>
      );
    case 'slider':
      return (
        <div key={element.id} style={style} className="flex flex-col">
          <label className="text-sm">{element.label}</label>
          <input type="range" className="w-full" />
        </div>
      );
    case 'label':
        return (
            <div key={element.id} style={style}>
                <p className="text-lg font-bold">{element.text}</p>
            </div>
        )
    default:
      return <div key={element.id} style={style} className="border border-dashed border-gray-400"><span className="text-xs p-1">{element.type}</span></div>;
  }
};

const GuiPreview = ({ controllerId }) => {
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePage, setActivePage] = useState('main');

  useEffect(() => {
    fetchDraftFiles();
  }, [controllerId]);

  const fetchDraftFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await guiAPI.getDraftFiles(controllerId);
      setFiles(response.data.files);
    } catch (err) {
      setError('Failed to load GUI files.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading Preview...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (!files || Object.keys(files).length === 0) {
    return <div className="text-center p-4 text-gray-500">No GUI files found for this controller.</div>;
  }

  const pagePath = `gui/pages/${activePage}.json`;
  const currentPage = files[pagePath];

  return (
    <div className="w-full h-full bg-gray-800 p-4 rounded-lg">
        <div className="relative w-full h-full bg-black overflow-hidden">
            {currentPage ? (
            currentPage.elements.map(renderElement)
            ) : (
            <div className="text-white text-center p-8">
                <p>Page '{activePage}' not found.</p>
                <p className="text-sm text-gray-400">Select a page to view.</p>
            </div>
            )}
        </div>
        <div className="mt-2 text-center">
            <select 
                value={activePage} 
                onChange={(e) => setActivePage(e.target.value)}
                className="bg-gray-700 text-white rounded p-1"
            >
            {Object.keys(files)
                .filter(path => path.startsWith('gui/pages/'))
                .map(path => {
                const pageName = path.replace('gui/pages/', '').replace('.json', '');
                return <option key={pageName} value={pageName}>{pageName}</option>;
                })}
            </select>
        </div>
    </div>
  );
};

export default GuiPreview;
