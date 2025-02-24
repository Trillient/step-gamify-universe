
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WeekSelectorProps {
  currentWeek: number;
  weekRanges: number[];
  onWeekChange: (week: number) => void;
}

const WeekSelector = ({ currentWeek, weekRanges, onWeekChange }: WeekSelectorProps) => {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-gray-500">Weekly Leaderboard 🏆</h3>
      <Select
        value={currentWeek.toString()}
        onValueChange={(value) => onWeekChange(Number(value))}
      >
        <SelectTrigger className="w-[180px] bg-white/50 backdrop-blur-sm">
          <SelectValue placeholder="Select week" />
        </SelectTrigger>
        <SelectContent>
          {weekRanges.map((week) => (
            <SelectItem key={week} value={week.toString()}>
              Week {week}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default WeekSelector;
