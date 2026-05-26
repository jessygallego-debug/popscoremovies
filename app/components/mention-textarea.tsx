"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import {
  searchMentionableUsers,
  type MentionableUserSummary,
} from "@/lib/profile-store";

type TextareaRef = {
  current: HTMLTextAreaElement | null;
};

type ActiveMention = {
  end: number;
  query: string;
  start: number;
};

type MentionTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  inputRef?: TextareaRef;
  onChange: (value: string) => void;
  value: string;
};

function findActiveMention(
  value: string,
  cursorPosition: number
): ActiveMention | null {
  const textBeforeCursor = value.slice(0, cursorPosition);
  const match = /(^|[^\w@])@([a-zA-Z0-9_]*)$/.exec(textBeforeCursor);

  if (!match) {
    return null;
  }

  const query = match[2] ?? "";

  return {
    end: cursorPosition,
    query,
    start: textBeforeCursor.length - query.length - 1,
  };
}

function resultButtonClass(isActive: boolean) {
  return `flex w-full items-center gap-3 px-3 py-2 text-left transition ${
    isActive
      ? "bg-yellow-400 text-black"
      : "bg-slate-950 text-white hover:bg-slate-900"
  }`;
}

export default function MentionTextarea({
  className,
  disabled,
  inputRef,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  onSelect,
  value,
  ...props
}: MentionTextareaProps) {
  const localTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const requestIdRef = useRef(0);
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [isFocused, setIsFocused] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionQuery, setSuggestionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MentionableUserSummary[]>([]);
  const activeMention = useMemo(
    () => findActiveMention(value, cursorPosition),
    [cursorPosition, value]
  );
  const activeMentionQuery = activeMention?.query ?? null;
  const activeMentionStart = activeMention?.start ?? null;
  const visibleSuggestions =
    suggestionQuery === activeMentionQuery ? suggestions : [];
  const isLoadingActiveMention = loadingQuery === activeMentionQuery;
  const isMenuOpen = Boolean(
    isFocused &&
      activeMention &&
      !disabled &&
      (isLoadingActiveMention || visibleSuggestions.length > 0)
  );

  const setTextareaRef = (node: HTMLTextAreaElement | null) => {
    localTextareaRef.current = node;

    if (inputRef) {
      inputRef.current = node;
    }
  };

  const updateCursorPosition = () => {
    const textarea = localTextareaRef.current;

    if (textarea) {
      setCursorPosition(textarea.selectionStart);
    }
  };

  useEffect(() => {
    if (activeMentionQuery === null || disabled) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timeout = window.setTimeout(() => {
      setLoadingQuery(activeMentionQuery);
      searchMentionableUsers(activeMentionQuery)
        .then((users) => {
          if (requestIdRef.current === requestId) {
            setSuggestions(users);
            setSuggestionQuery(activeMentionQuery);
            setSelectedIndex(0);
          }
        })
        .catch(() => {
          if (requestIdRef.current === requestId) {
            setSuggestions([]);
            setSuggestionQuery(activeMentionQuery);
          }
        })
        .finally(() => {
          if (requestIdRef.current === requestId) {
            setLoadingQuery(null);
          }
        });
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeMentionQuery, activeMentionStart, disabled]);

  const insertMention = (user: MentionableUserSummary) => {
    if (!activeMention) {
      return;
    }

    const mentionText = `@${user.username} `;
    const nextValue =
      value.slice(0, activeMention.start) +
      mentionText +
      value.slice(activeMention.end);
    const nextCursorPosition = activeMention.start + mentionText.length;

    onChange(nextValue);
    setSuggestions([]);
    setCursorPosition(nextCursorPosition);

    window.requestAnimationFrame(() => {
      const textarea = localTextareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMenuOpen && visibleSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(
          (currentIndex) => (currentIndex + 1) % visibleSuggestions.length
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (currentIndex) =>
            (currentIndex - 1 + visibleSuggestions.length) %
            visibleSuggestions.length
        );
        return;
      }

      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(visibleSuggestions[selectedIndex]);
        return;
      }
    }

    if (isMenuOpen && event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setSuggestionQuery(null);
      setLoadingQuery(null);
      return;
    }

    onKeyDown?.(event);
  };

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={setTextareaRef}
        disabled={disabled}
        value={value}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setCursorPosition(event.target.selectionStart);
        }}
        onClick={updateCursorPosition}
        onFocus={(event) => {
          setIsFocused(true);
          updateCursorPosition();
          onFocus?.(event);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={updateCursorPosition}
        onSelect={(event) => {
          updateCursorPosition();
          onSelect?.(event);
        }}
        className={className}
      />

      {isMenuOpen ? (
        <div className="absolute left-0 right-0 top-full z-[160] mt-2 max-h-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
          {visibleSuggestions.length > 0 ? (
            <div className="max-h-64 overflow-y-auto py-1">
              {visibleSuggestions.map((user, index) => (
                <button
                  key={user.userId}
                  type="button"
                  className={resultButtonClass(selectedIndex === index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(user);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-black ${
                      selectedIndex === index
                        ? "border-black/20 bg-black/15 text-black"
                        : "border-yellow-400/25 bg-yellow-400/10 text-white"
                    }`}
                  >
                    {user.avatar}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">
                      @{user.username}
                    </span>
                    <span
                      className={`block truncate text-xs font-bold ${
                        selectedIndex === index
                          ? "text-black/65"
                          : "text-slate-400"
                      }`}
                    >
                      {user.displayName}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-2 text-sm font-bold text-slate-400">
              Searching...
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
