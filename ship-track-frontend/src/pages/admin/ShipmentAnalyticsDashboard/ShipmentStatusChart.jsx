import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const ShipmentStatusChart = ({ data = [] }) => {

const chartData = [
  {
    name: "Delivered",
    value: data.filter(
      (shipment) => shipment.status?.toUpperCase() === "DELIVERED"
    ).length,
  },
  {
    name: "In Transit",
    value: data.filter(
      (shipment) =>
        ["IN_TRANSIT", "IN TRANSIT"].includes(
          shipment.status?.toUpperCase()
        )
    ).length,
  },
  {
    name: "Pending",
    value: data.filter(
      (shipment) => shipment.status?.toUpperCase() === "PENDING"
    ).length,
  },
  {
    name: "Cancelled",
    value: data.filter(
      (shipment) => shipment.status?.toUpperCase() === "CANCELLED"
    ).length,
  },
  {
    name: "Delayed",
    value: data.filter(
      (shipment) => shipment.status?.toUpperCase() === "DELAYED"
    ).length,
  },
];


  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">

      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">
          Shipment Status
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Current shipment distribution
        </p>
      </div>

      {/* Chart */}
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>

            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
            />

          </PieChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default ShipmentStatusChart;