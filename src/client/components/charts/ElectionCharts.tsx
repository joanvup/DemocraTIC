import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { ElectionStats } from '../../../shared/types.js';

interface Props {
  stats: ElectionStats | null;
  isDark: boolean;
}

// Colores sofisticados para la gráfica tipo torta
const PIE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
];

export function ElectionCharts({ stats, isDark }: Props) {
  if (!stats) return null;

  // Formatear datos para la línea de tiempo (flujo)
  const flowData = stats.flow?.map(f => {
    const d = new Date(f.time);
    const hour = d.getHours().toString().padStart(2, '0');
    const min = d.getMinutes().toString().padStart(2, '0');
    return {
      timeLabel: `${hour}:${min}`,
      votes: f.votes
    };
  }) || [];

  // Formatear datos para la gráfica tipo torta
  const pieData = stats.results.map(r => ({
    name: r.candidate_name,
    value: r.votes_count
  }));

  const textColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 : slate-500
  const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 : slate-200

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
      {/* Gráfica de Flujo de Votos */}
      <div className={`rounded-3xl p-6 border shadow-lg ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Flujo de Votación</h3>
        <div className="h-64 w-full">
          {flowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis 
                  dataKey="timeLabel" 
                  stroke={textColor} 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke={textColor} 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="votes" 
                  name="Votos Emitidos" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: isDark ? '#0f172a' : '#ffffff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className={textColor}>Aún no hay datos suficientes</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfica de Distribución (Torta) */}
      <div className={`rounded-3xl p-6 border shadow-lg ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Distribución de Votos</h3>
        <div className="h-64 w-full">
          {pieData.some(d => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ fontSize: '12px', color: textColor }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className={textColor}>Aún no hay votos registrados</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
