import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { c, font } from "../theme";

const MONTHS_AHEAD = 6;
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildMonthGrid(viewMonth: Date): (Date | null)[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return cells;
}

const triggerStyle = {
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 10,
  paddingVertical: 12,
  paddingHorizontal: 14,
  backgroundColor: "#fff",
  marginBottom: 14,
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
};

function CalendarModal({
  visible,
  selectedKeys,
  onToggle,
  onClose,
  onDone,
}: {
  visible: boolean;
  selectedKeys: Set<string>;
  onToggle: (date: Date) => void;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const viewMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const cells = buildMonthGrid(viewMonth);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Pressable onPress={() => setMonthOffset((o) => Math.max(0, o - 1))} hitSlop={10} disabled={monthOffset === 0}>
              <Text style={{ fontSize: 18, color: monthOffset === 0 ? c.mutedLight : c.text }}>‹</Text>
            </Pressable>
            <Text style={{ fontSize: 15, fontFamily: font.extrabold, color: c.text }}>
              {viewMonth.toLocaleString("en-IN", { month: "long", year: "numeric" })}
            </Text>
            <Pressable onPress={() => setMonthOffset((o) => Math.min(MONTHS_AHEAD, o + 1))} hitSlop={10} disabled={monthOffset === MONTHS_AHEAD}>
              <Text style={{ fontSize: 18, color: monthOffset === MONTHS_AHEAD ? c.mutedLight : c.text }}>›</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row" }}>
            {WEEKDAY_LABELS.map((w, i) => (
              <View key={i} style={{ width: `${100 / 7}%`, alignItems: "center", marginBottom: 6 }}>
                <Text style={{ fontSize: 11, fontFamily: font.bold, color: c.muted }}>{w}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {cells.map((date, i) => {
              if (!date) return <View key={i} style={{ width: `${100 / 7}%`, height: 40 }} />;
              const key = toDateKey(date);
              const isPast = date < today;
              const isSelected = selectedKeys.has(key);
              return (
                <View key={i} style={{ width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" }}>
                  <Pressable
                    disabled={isPast}
                    onPress={() => onToggle(date)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? c.green : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontFamily: isSelected ? font.bold : font.regular,
                        color: isPast ? c.mutedLight : isSelected ? "#fff" : c.text,
                      }}
                    >
                      {date.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={onDone ?? onClose}
            style={{ backgroundColor: c.navy, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 16 }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontFamily: font.bold }}>{onDone ? "Done" : "Close"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type CalendarFieldProps =
  | { mode: "single"; value: Date | null; onChange: (date: Date) => void; placeholder?: string }
  | { mode: "multi"; value: Date[]; onChange: (dates: Date[]) => void; placeholder?: string };

const fmtShort = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function CalendarField(props: CalendarFieldProps) {
  const [open, setOpen] = useState(false);
  const { placeholder = "Select date" } = props;
  const selectedDates = props.mode === "single" ? (props.value ? [props.value] : []) : props.value;
  const selectedKeys = new Set(selectedDates.map(toDateKey));

  const toggle = (date: Date) => {
    if (props.mode === "single") {
      props.onChange(date);
      setOpen(false);
    } else {
      const key = toDateKey(date);
      const exists = props.value.some((d) => toDateKey(d) === key);
      props.onChange(exists ? props.value.filter((d) => toDateKey(d) !== key) : [...props.value, date]);
    }
  };

  const summary =
    props.mode === "single"
      ? props.value
        ? fmtShort(props.value)
        : placeholder
      : props.value.length
      ? `${props.value.length} date${props.value.length === 1 ? "" : "s"} selected`
      : placeholder;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={triggerStyle}>
        <Text style={{ fontSize: 14, fontFamily: font.regular, color: selectedDates.length ? c.text : c.mutedLight }}>
          {summary}
        </Text>
        <Feather name="calendar" size={16} color={c.muted} />
      </Pressable>

      {props.mode === "multi" && props.value.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -8, marginBottom: 14 }}>
          {props.value
            .slice()
            .sort((a, b) => a.getTime() - b.getTime())
            .map((d) => (
              <Pressable
                key={toDateKey(d)}
                onPress={() => props.onChange(props.value.filter((v) => toDateKey(v) !== toDateKey(d)))}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: c.chipBg,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                }}
              >
                <Text style={{ fontSize: 12, fontFamily: font.semibold, color: c.text }}>{fmtShort(d)}</Text>
                <Feather name="x" size={12} color={c.muted} />
              </Pressable>
            ))}
        </View>
      )}

      <CalendarModal
        visible={open}
        selectedKeys={selectedKeys}
        onToggle={toggle}
        onClose={() => setOpen(false)}
        onDone={props.mode === "multi" ? () => setOpen(false) : undefined}
      />
    </>
  );
}
