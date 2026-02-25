// FormFieldRenderer.jsx
export default function FormFieldRenderer({ field, value, onChange }) {
  const { name, label, type, options = [] } = field;

  const commonProps = {
    id: name,
    name,
    value,
    onChange: (e) => onChange(name, e.target.value),
    className: "w-full border border-gray-300 rounded px-3 py-2 mb-4",
  };

  switch (type) {
    case "break":
      return (
        <div>
          
        </div>
      );
      
    case "short":
      return (
        <div>
          <label htmlFor={name} className="block mb-1 font-medium">{label}</label>
          <input type="text" {...commonProps} />
        </div>
      );

    case "long":
      return (
        <div>
          <label htmlFor={name} className="block mb-1 font-medium">{label}</label>
          <textarea rows={4} {...commonProps} />
        </div>
      );
    
    case "number":
      return (
        <div>
          <label htmlFor={name} className="block mb-1 font-medium">{label}</label>
          <input type="number" {...commonProps} />
        </div>
      );

    case "date":
      return (
        <div>
          <label htmlFor={name} className="block mb-1 font-medium">{label}</label>
          <input type="date" {...commonProps} />
        </div>
      );
    
    case "time":
        return (
            <div>
            <label htmlFor={name} className="block mb-1 font-medium">{label}</label>
            <input type="time" {...commonProps} />
            </div>
        );

    case "checkbox":
        return (
            <div>
            <label className="block mb-1 font-medium">{label}</label>
            <div className="grid grid-cols-3 gap-4">
                {options.map((option, idx) => (
                <div key={idx} className="flex items-center">
                    <input
                    type="checkbox"
                    id={`${name}-${option}`}
                    name={name}
                    value={option}
                    checked={value.includes(option)}
                    onChange={(e) => {
                        const newValue = [...value];
                        if (e.target.checked) {
                        newValue.push(option);
                        } else {
                        const index = newValue.indexOf(option);
                        if (index > -1) newValue.splice(index, 1);
                        }
                        onChange(name, newValue);
                    }}
                    className="mr-2"
                    />
                    <label htmlFor={`${name}-${option}`} className="text-sm">{option}</label>
                </div>
                ))}
            </div>
            </div>
        );


    case "option":
      return (
        <div>
          <label className="block mb-1 font-medium">{label}</label>
          <select {...commonProps}>
            <option value="">Select</option>
            {options.map((opt, idx) => (
              <option key={idx} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={value || false}
            onChange={(e) => onChange(name, e.target.checked)}
            className="mr-2"
          />
          <label htmlFor={name} className="font-medium">{label}</label>
        </div>
      );

    default:
      return null;
  }
}
