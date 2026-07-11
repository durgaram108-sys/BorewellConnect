import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { c, font } from "../theme";

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

function PickerModal({
  visible,
  title,
  options,
  isSelected,
  onToggle,
  onClose,
  onDone,
}: {
  visible: boolean;
  title: string;
  options: string[];
  isSelected: (opt: string) => boolean;
  onToggle: (opt: string) => void;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(search.toLowerCase())),
    [options, search]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "75%", padding: 20 }}>
          <Text style={{ fontSize: 17, fontFamily: font.extrabold, color: c.text, marginBottom: 12 }}>{title}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search..."
            placeholderTextColor={c.mutedLight}
            style={{
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 14,
              fontSize: 14,
              fontFamily: font.regular,
              color: c.text,
              marginBottom: 10,
            }}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            style={{ marginBottom: 10 }}
            ListEmptyComponent={
              <Text style={{ fontSize: 13, color: c.muted, fontFamily: font.regular, paddingVertical: 12 }}>
                No matches.
              </Text>
            }
            renderItem={({ item }) => {
              const selected = isSelected(item);
              return (
                <Pressable
                  onPress={() => onToggle(item)}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: c.trackBg,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, fontFamily: font.regular, color: c.text }}>{item}</Text>
                  {selected && <Feather name="check" size={16} color={c.green} />}
                </Pressable>
              );
            }}
          />
          <Pressable
            onPress={onDone ?? onClose}
            style={{ backgroundColor: c.navy, borderRadius: 10, paddingVertical: 13, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 14, fontFamily: font.bold }}>{onDone ? "Done" : "Close"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabledMessage,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabledMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const disabled = options.length === 0;

  return (
    <>
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[triggerStyle, disabled && { backgroundColor: "#F5F4F1" }]}
      >
        <Text
          style={{
            fontSize: 14,
            fontFamily: font.regular,
            color: value ? c.text : c.mutedLight,
          }}
        >
          {value || (disabled && disabledMessage ? disabledMessage : placeholder)}
        </Text>
        <Feather name="chevron-down" size={16} color={c.muted} />
      </Pressable>
      <PickerModal
        visible={open}
        title={placeholder}
        options={options}
        isSelected={(opt) => opt === value}
        onToggle={(opt) => {
          onChange(opt);
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function MultiSelectField({
  values,
  onChange,
  options,
  placeholder = "Select...",
}: {
  values: string[] | undefined;
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [customArea, setCustomArea] = useState("");
  const selected = values ?? [];

  const toggle = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter((v) => v !== opt) : [...selected, opt]);
  };

  const addCustom = () => {
    const trimmed = customArea.trim();
    if (!trimmed || selected.includes(trimmed)) return;
    onChange([...selected, trimmed]);
    setCustomArea("");
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={triggerStyle}>
        <Text style={{ fontSize: 14, fontFamily: font.regular, color: selected.length ? c.text : c.mutedLight }}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </Text>
        <Feather name="chevron-down" size={16} color={c.muted} />
      </Pressable>

      {selected.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: -8, marginBottom: 14 }}>
          {selected.map((v) => (
            <Pressable
              key={v}
              onPress={() => onChange(selected.filter((x) => x !== v))}
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
              <Text style={{ fontSize: 12, fontFamily: font.semibold, color: c.text }}>{v}</Text>
              <Feather name="x" size={12} color={c.muted} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8, marginTop: -6, marginBottom: 14 }}>
        <TextInput
          value={customArea}
          onChangeText={setCustomArea}
          placeholder="+ Add custom area"
          placeholderTextColor={c.mutedLight}
          onSubmitEditing={addCustom}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 14,
            fontSize: 13,
            fontFamily: font.regular,
            color: c.text,
            backgroundColor: "#fff",
          }}
        />
        <Pressable
          onPress={addCustom}
          style={{ paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.chipBg, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 13, fontFamily: font.bold, color: c.navy }}>Add</Text>
        </Pressable>
      </View>

      <PickerModal
        visible={open}
        title={placeholder}
        options={options}
        isSelected={(opt) => selected.includes(opt)}
        onToggle={toggle}
        onClose={() => setOpen(false)}
        onDone={() => setOpen(false)}
      />
    </>
  );
}
