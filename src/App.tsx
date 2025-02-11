import React, { useState, useEffect } from 'react';
import { Plus, Minus, Code, FileDown, Globe, Shield, Play, Eye } from 'lucide-react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import  {LivePreview}  from './components/LivePreview';

SyntaxHighlighter.registerLanguage('typescript', typescript);

interface StateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean';
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface ApiEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
}

function App() {
  const [componentName, setComponentName] = useState('');
  const [stateVariables, setStateVariables] = useState<StateVariable[]>([]);
  const [includeInputs, setIncludeInputs] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [apiEndpoints, setApiEndpoints] = useState<ApiEndpoint[]>([]);
  const [showValidation, setShowValidation] = useState<number | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  const addStateVariable = () => {
    setStateVariables([...stateVariables, { 
      name: '', 
      type: 'string',
      validation: {
        required: false
      }
    }]);
  };

  const addApiEndpoint = () => {
    setApiEndpoints([...apiEndpoints, {
      name: '',
      method: 'GET',
      url: ''
    }]);
  };

  const removeStateVariable = (index: number) => {
    setStateVariables(stateVariables.filter((_, i) => i !== index));
  };

  const removeApiEndpoint = (index: number) => {
    setApiEndpoints(apiEndpoints.filter((_, i) => i !== index));
  };

  const updateStateVariable = (index: number, field: keyof StateVariable, value: any) => {
    const newVariables = [...stateVariables];
    if (field === 'validation') {
      newVariables[index] = {
        ...newVariables[index],
        validation: { ...newVariables[index].validation, ...value }
      };
    } else {
      newVariables[index] = { ...newVariables[index], [field]: value };
    }
    setStateVariables(newVariables);
  };

  const updateApiEndpoint = (index: number, field: keyof ApiEndpoint, value: string) => {
    const newEndpoints = [...apiEndpoints];
    newEndpoints[index] = { ...newEndpoints[index], [field]: value };
    setApiEndpoints(newEndpoints);
  };

  const generateValidationCode = (variable: StateVariable) => {
    if (!variable.validation) return '';
    
    const validations = [];
    if (variable.validation.required) {
      validations.push(`if (!${variable.name}) errors.${variable.name} = 'This field is required';`);
    }
    if (variable.validation.minLength) {
      validations.push(`if (${variable.name}.length < ${variable.validation.minLength}) errors.${variable.name} = 'Minimum length is ${variable.validation.minLength}';`);
    }
    if (variable.validation.maxLength) {
      validations.push(`if (${variable.name}.length > ${variable.validation.maxLength}) errors.${variable.name} = 'Maximum length is ${variable.validation.maxLength}';`);
    }
    if (variable.validation.min && variable.type === 'number') {
      validations.push(`if (${variable.name} < ${variable.validation.min}) errors.${variable.name} = 'Minimum value is ${variable.validation.min}';`);
    }
    if (variable.validation.max && variable.type === 'number') {
      validations.push(`if (${variable.name} > ${variable.validation.max}) errors.${variable.name} = 'Maximum value is ${variable.validation.max}';`);
    }
    if (variable.validation.pattern) {
      validations.push(`if (!new RegExp('${variable.validation.pattern}').test(${variable.name})) errors.${variable.name} = 'Invalid format';`);
    }
    return validations.join('\n    ');
  };

  const generateComponent = () => {
    const code = generatePreview();
    setGeneratedCode(code);
    setShowPreview(true);
  };

  const generatePreview = () => {
    const stateInit = stateVariables
      .map(
        (v) => `const [${v.name}, set${v.name.charAt(0).toUpperCase() + v.name.slice(1)}] = useState(${
          v.type === 'string' ? '""' : v.type === 'number' ? '0' : 'false'
        });`
      )
      .join('\n  ');

    const apiStates = apiEndpoints.map(endpoint => 
      `const [${endpoint.name}Data, set${endpoint.name}Data] = useState(null);
  const [${endpoint.name}Loading, set${endpoint.name}Loading] = useState(false);
  const [${endpoint.name}Error, set${endpoint.name}Error] = useState(null);`
    ).join('\n  ');

    const apiFunctions = apiEndpoints.map(endpoint => `
  const fetch${endpoint.name} = async () => {
    try {
      set${endpoint.name}Loading(true);
      set${endpoint.name}Error(null);
      const response = await axios.${endpoint.method.toLowerCase()}('${endpoint.url}');
      set${endpoint.name}Data(response.data);
    } catch (error) {
      set${endpoint.name}Error(error.message);
    } finally {
      set${endpoint.name}Loading(false);
    }
  };`
    ).join('\n');

    const validationFunction = `
  const validate = () => {
    const errors = {};
    ${stateVariables.map(v => generateValidationCode(v)).filter(Boolean).join('\n    ')}
    return errors;
  };`;

    const inputFields = includeInputs
      ? stateVariables.map(variable => `
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ${variable.name}
            ${variable.validation?.required ? ' *' : ''}
          </label>
          <input
            type="${variable.type === 'boolean' ? 'checkbox' : variable.type === 'number' ? 'number' : 'text'}"
            value={${variable.name}}
            onChange={(e) => set${variable.name.charAt(0).toUpperCase() + variable.name.slice(1)}(${
              variable.type === 'boolean' 
                ? 'e.target.checked' 
                : variable.type === 'number' 
                  ? 'Number(e.target.value)' 
                  : 'e.target.value'
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>`
      ).join('\n')
      : '';

    return `import React, { useState, useEffect } from 'react';
import axios from 'axios';

function ${componentName}() {
  // State initialization
  ${stateInit}
  
  // API states
  ${apiStates}

  // API functions
  ${apiFunctions}

  // Validation function
  ${validationFunction}

  useEffect(() => {
    // Fetch initial data
    ${apiEndpoints.map(endpoint => `fetch${endpoint.name}();`).join('\n    ')}
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">${componentName}</h1>
      
      <form onSubmit={(e) => {
        e.preventDefault();
        const errors = validate();
        if (Object.keys(errors).length === 0) {
          // Form is valid, proceed with submission
          console.log('Form is valid');
        } else {
          console.log('Validation errors:', errors);
        }
      }}>
        ${inputFields}
        
        <div className="mt-6">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Submit
          </button>
        </div>
      </form>

      {/* API Data Display */}
      ${apiEndpoints.map(endpoint => `
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">${endpoint.name} Data</h2>
        {${endpoint.name}Loading && <p>Loading...</p>}
        {${endpoint.name}Error && <p className="text-red-500">Error: {${endpoint.name}Error}</p>}
        {${endpoint.name}Data && (
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
            {JSON.stringify(${endpoint.name}Data, null, 2)}
          </pre>
        )}
      </div>`).join('\n')}
    </div>
  );
}

export default ${componentName};`;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-6">React Component Generator</h1>
            
            {/* Component Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Component Name
              </label>
              <input
                type="text"
                value={componentName}
                onChange={(e) => setComponentName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="MyComponent"
              />
            </div>

            {/* State Variables */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  State Variables
                </label>
                <button
                  onClick={addStateVariable}
                  className="flex items-center px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Plus size={16} className="mr-1" /> Add Variable
                </button>
              </div>
              
              {stateVariables.map((variable, index) => (
                <div key={index} className="mb-4">
                  <div className="flex gap-4 mb-2">
                    <input
                      type="text"
                      value={variable.name}
                      onChange={(e) => updateStateVariable(index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Variable name"
                    />
                    <select
                      value={variable.type}
                      onChange={(e) => updateStateVariable(index, 'type', e.target.value as StateVariable['type'])}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                    <button
                      onClick={() => setShowValidation(showValidation === index ? null : index)}
                      className="p-2 text-blue-500 hover:text-blue-600"
                    >
                      <Shield size={20} />
                    </button>
                    <button
                      onClick={() => removeStateVariable(index)}
                      className="p-2 text-red-500 hover:text-red-600"
                    >
                      <Minus size={20} />
                    </button>
                  </div>
                  
                  {showValidation === index && (
                    <div className="ml-4 p-4 bg-gray-50 rounded-md">
                      <h4 className="font-medium mb-2">Validation Rules</h4>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={variable.validation?.required}
                            onChange={(e) => updateStateVariable(index, 'validation', { required: e.target.checked })}
                            className="mr-2"
                          />
                          Required
                        </label>
                        
                        {variable.type === 'string' && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Min length"
                                value={variable.validation?.minLength || ''}
                                onChange={(e) => updateStateVariable(index, 'validation', { minLength: parseInt(e.target.value) })}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <span className="text-sm text-gray-600">Min length</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Max length"
                                value={variable.validation?.maxLength || ''}
                                onChange={(e) => updateStateVariable(index, 'validation', { maxLength: parseInt(e.target.value) })}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <span className="text-sm text-gray-600">Max length</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Pattern (regex)"
                                value={variable.validation?.pattern || ''}
                                onChange={(e) => updateStateVariable(index, 'validation', { pattern: e.target.value })}
                                className="w-full px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <span className="text-sm text-gray-600">Pattern</span>
                            </div>
                          </>
                        )}
                        
                        {variable.type === 'number' && (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Min value"
                                value={variable.validation?.min || ''}
                                onChange={(e) => updateStateVariable(index, 'validation', { min: parseInt(e.target.value) })}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <span className="text-sm text-gray-600">Min value</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                placeholder="Max value"
                                value={variable.validation?.max || ''}
                                onChange={(e) => updateStateVariable(index, 'validation', { max: parseInt(e.target.value) })}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md"
                              />
                              <span className="text-sm text-gray-600">Max value</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* API Endpoints */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  API Endpoints
                </label>
                <button
                  onClick={addApiEndpoint}
                  className="flex items-center px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Globe size={16} className="mr-1" /> Add Endpoint
                </button>
              </div>
              
              {apiEndpoints.map((endpoint, index) => (
                <div key={index} className="flex gap-4 mb-3">
                  <input
                    type="text"
                    value={endpoint.name}
                    onChange={(e) => updateApiEndpoint(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Endpoint name"
                  />
                  <select
                    value={endpoint.method}
                    onChange={(e) => updateApiEndpoint(index, 'method', e.target.value as ApiEndpoint['method'])}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={endpoint.url}
                    onChange={(e) => updateApiEndpoint(index, 'url', e.target.value)}
                    className="flex-2 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="API URL"
                  />
                  <button
                    onClick={() => removeApiEndpoint(index)}
                    className="p-2 text-red-500 hover:text-red-600"
                  >
                    <Minus size={20} />
                  </button>
                </div>
              ))}
            </div>

            {/* Include Inputs Toggle */}
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeInputs}
                  onChange={(e) => setIncludeInputs(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  Generate Input Fields
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                <Code size={16} className="mr-2" /> Preview Code
              </button>
              <button
                onClick={generateComponent}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                <FileDown size={16} className="mr-2" /> Generate Component
              </button>
              {/* <button
                onClick={() => setShowLivePreview(!showLivePreview)}
                className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
              >
                <Eye size={16} className="mr-2" /> Live Preview
              </button> */}
            </div>
          </div>

          <div className="space-y-6">
            {/* Code Preview */}
            {showPreview && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Generated Code</h2>
                <SyntaxHighlighter 
                  language="typescript"
                  style={atomOneDark}
                  customStyle={{
                    borderRadius: '0.5rem',
                    padding: '1rem'
                  }}
                >
                  {generatedCode}
                </SyntaxHighlighter>
              </div>
            )}

            {/* Live Preview */}
            {showLivePreview && generatedCode && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold mb-4">Live Preview</h2>
                <div className="border rounded-lg p-4">
                  <LivePreview code={generatedCode} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;