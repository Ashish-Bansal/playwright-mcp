import React, { useState } from 'react';
import { Play } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';

const Execute: React.FC = () => {
  const [code, setCode] = useState<string>(
`async function run(page) {
    let title = await page.title();
    return title
}`);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const executeCode = async () => {
    try {
      const response = await (window as any).executeCode(code);
      if (response.error) {
        setError(response.message);
        setResult('');
      } else {
        setResult(JSON.stringify(response.result));
        setLogs(response.logs);
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResult('');
      setLogs([]);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 bg-white border-b border-zinc-200">
        <Editor
          value={code}
          onValueChange={code => setCode(code)}
          highlight={code => highlight(code, languages.js)}
          padding={10}
          className="font-mono mb-4 min-h-[200px] border rounded-md"
          style={{
            fontFamily: '"Fira code", "Fira Mono", monospace',
            fontSize: 14,
          }}
        />
        <button
          onClick={executeCode}
          className="text-zinc-900 border border-zinc-200 rounded-md cursor-pointer h-9 px-3 flex items-center justify-center gap-2 hover:bg-zinc-50"
        >
          <Play size={20} />
          <span>Execute</span>
        </button>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="font-medium text-red-800 mb-1">Error</div>
            <div className="text-red-600 font-mono text-sm whitespace-pre-wrap">
              {error}
            </div>
          </div>
        )}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="font-medium text-green-800 mb-1">Result</div>
            <div className="text-green-700 font-mono text-sm whitespace-pre-wrap">
              {result}
            </div>
          </div>
        )}
        {logs.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <div className="font-medium text-gray-800 mb-2">Logs</div>
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="font-mono text-sm text-gray-600 flex items-start">
                  <span className="text-gray-400 mr-2">{`>`}</span>
                  <span className="whitespace-pre-wrap">{log}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Execute;
