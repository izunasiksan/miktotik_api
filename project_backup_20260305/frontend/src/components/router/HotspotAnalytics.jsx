import React from 'react';
import { getHotspotReports } from '../../services/api.js';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

function SizedContainer({ heightClass = "h-80", children }) {
  const ref = React.useRef(null);
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const measure = () => {
      const rect = ref.current.getBoundingClientRect();
      const w = Math.max(0, Math.floor(rect.width));
      const h = Math.max(0, Math.floor(rect.height));
      setSize({ w, h });
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const ready = size.w > 0 && size.h > 0;
  const childWithKey = React.isValidElement(children)
    ? React.cloneElement(children, { key: `${size.w}x${size.h}` })
    : children;

  return (
    <div ref={ref} className={`${heightClass} w-full`}>
      {ready ? (
        childWithKey
      ) : (
        <div className="h-full w-full bg-gray-100 rounded animate-pulse" />
      )}
    </div>
  );
}

const HotspotAnalytics = ({ boardId }) => {
  const { data: stats = [], isLoading, isError } = useQuery({
    queryKey: ['hotspot-reports', boardId],
    queryFn: () => getHotspotReports(boardId),
  });

  React.useEffect(() => {
    if (isError) {
      toast.error('Failed to load hotspot analytics');
    }
  }, [isError]);

  if (isLoading) return <LoadingSpinner />;

  // Transform data for chart if needed, assuming API returns array of objects
  const chartData = stats.map(item => ({
    name: item.log_date ? new Date(item.log_date).toLocaleDateString() : item.time,
    users: item.active_users,
    traffic: (Number(item.traffic_total) / (1024 * 1024) || Number(item.traffic_mb) || 0).toFixed(2)
  }));

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <div className="flex items-center mb-6">
        <Activity className="w-5 h-5 mr-2 text-indigo-500" />
        <h3 className="text-lg font-medium text-gray-900">Hotspot Analytics</h3>
      </div>

      <SizedContainer heightClass="h-80">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="users" name="Active Users" fill="#8884d8" />
            <Bar yAxisId="right" dataKey="traffic" name="Traffic (MB)" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </SizedContainer>
      
      {stats.length === 0 && (
        <div className="text-center text-gray-500 mt-4">
            No analytics data available for this period.
        </div>
      )}
    </div>
  );
};

export default HotspotAnalytics;
