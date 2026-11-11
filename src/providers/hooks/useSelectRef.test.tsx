import {describe, it, expect, vi} from "vitest";
import {render} from "@testing-library/react";
import React, {forwardRef} from "react";
import type {LysQueryRefInterface} from "../LysQueryProvider/types";
import {
    MultiSelectRefInterface,
    SelectRefInterface,
    useMultiSelectRef,
    useSelectRef
} from "./useSelectRef";

interface Fact {
    id: string;
    content: string;
}

const FACTS: Fact[] = [
    {id: "a", content: "First"},
    {id: "b", content: "Second"},
    {id: "c", content: "Third"},
];

function queryRefOf(overrides: Partial<LysQueryRefInterface> = {}): LysQueryRefInterface {
    return {hasPermission: true, isLoading: false, data: undefined, load: vi.fn(), ...overrides};
}

interface SelectProps {
    queryRef: LysQueryRefInterface | null;
    items: Fact[];
}

const SingleSelect = forwardRef<SelectRefInterface<Fact>, SelectProps & {value: string | null}>(
    ({queryRef, items, value}, ref) => {
        useSelectRef(ref, {queryRef, items, value});
        return null;
    }
);

const MultiSelect = forwardRef<MultiSelectRefInterface<Fact>, SelectProps & {value: string[] | undefined}>(
    ({queryRef, items, value}, ref) => {
        useMultiSelectRef(ref, {queryRef, items, value});
        return null;
    }
);

describe("useSelectRef", () => {
    it("resolves the selected option from the loaded ones", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        render(<SingleSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value="b" />);

        expect(ref.current?.selectedItem).toEqual({id: "b", content: "Second"});
        expect(ref.current?.hasPermission).toBe(true);
        expect(ref.current?.isLoading).toBe(false);
    });

    it("exposes no option without a value or when the value is not loaded", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        const {rerender} = render(<SingleSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value={null} />);
        expect(ref.current?.selectedItem).toBeNull();

        rerender(<SingleSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value="unknown" />);
        expect(ref.current?.selectedItem).toBeNull();
    });

    it("reports no permission before the query ref exists", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        render(<SingleSelect ref={ref} queryRef={null} items={[]} value="a" />);

        expect(ref.current?.hasPermission).toBe(false);
        expect(ref.current?.isLoading).toBe(false);
        expect(ref.current?.selectedItem).toBeNull();
    });

    it("resolves the value once the options arrive", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        const {rerender} = render(
            <SingleSelect ref={ref} queryRef={queryRefOf({isLoading: true})} items={[]} value="c" />
        );
        expect(ref.current?.isLoading).toBe(true);
        expect(ref.current?.selectedItem).toBeNull();

        rerender(<SingleSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value="c" />);
        expect(ref.current?.isLoading).toBe(false);
        expect(ref.current?.selectedItem).toEqual({id: "c", content: "Third"});
    });

    it("follows a value the parent changes", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        const queryRef = queryRefOf();
        const {rerender} = render(<SingleSelect ref={ref} queryRef={queryRef} items={FACTS} value="a" />);
        rerender(<SingleSelect ref={ref} queryRef={queryRef} items={FACTS} value="b" />);

        expect(ref.current?.selectedItem?.id).toBe("b");
    });

    it("keeps the same handle while nothing changes", () => {
        const handles: SelectRefInterface<Fact>[] = [];
        const collect = (handle: SelectRefInterface<Fact> | null) => {
            if (handle) {
                handles.push(handle);
            }
        };
        const queryRef = queryRefOf();
        const {rerender} = render(<SingleSelect ref={collect} queryRef={queryRef} items={FACTS} value="a" />);
        rerender(<SingleSelect ref={collect} queryRef={queryRef} items={FACTS} value="a" />);

        expect(handles).toHaveLength(1);
    });
});

describe("useMultiSelectRef", () => {
    it("resolves the selected options in the order of the value", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        render(<MultiSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value={["c", "a"]} />);

        expect(ref.current?.selectedItems.map(item => item.id)).toEqual(["c", "a"]);
    });

    it("leaves out the values missing from the loaded options", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        render(<MultiSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value={["a", "unknown"]} />);

        expect(ref.current?.selectedItems.map(item => item.id)).toEqual(["a"]);
    });

    it("exposes an empty selection for an absent value", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        render(<MultiSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value={undefined} />);

        expect(ref.current?.selectedItems).toEqual([]);
    });

    it("exposes an empty selection for an empty value", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        render(<MultiSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value={[]} />);

        expect(ref.current?.selectedItems).toEqual([]);
    });

    it("keeps the same handle for a new array holding the same selection", () => {
        const handles: MultiSelectRefInterface<Fact>[] = [];
        const collect = (handle: MultiSelectRefInterface<Fact> | null) => {
            if (handle) {
                handles.push(handle);
            }
        };
        const queryRef = queryRefOf();
        const {rerender} = render(<MultiSelect ref={collect} queryRef={queryRef} items={FACTS} value={["a", "b"]} />);
        rerender(<MultiSelect ref={collect} queryRef={queryRef} items={FACTS} value={["a", "b"]} />);

        expect(handles).toHaveLength(1);
    });

    it("hands a new handle when the selection changes", () => {
        const handles: MultiSelectRefInterface<Fact>[] = [];
        const collect = (handle: MultiSelectRefInterface<Fact> | null) => {
            if (handle) {
                handles.push(handle);
            }
        };
        const queryRef = queryRefOf();
        const {rerender} = render(<MultiSelect ref={collect} queryRef={queryRef} items={FACTS} value={["a"]} />);
        rerender(<MultiSelect ref={collect} queryRef={queryRef} items={FACTS} value={["a", "b"]} />);

        expect(handles.map(handle => handle.selectedItems.length)).toEqual([1, 2]);
    });

    it("resolves the selection once the options arrive", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        const {rerender} = render(
            <MultiSelect ref={ref} queryRef={queryRefOf({isLoading: true})} items={[]} value={["b", "a"]} />
        );
        expect(ref.current?.isLoading).toBe(true);
        expect(ref.current?.selectedItems).toEqual([]);

        rerender(<MultiSelect ref={ref} queryRef={queryRefOf()} items={FACTS} value={["b", "a"]} />);
        expect(ref.current?.isLoading).toBe(false);
        expect(ref.current?.selectedItems.map(item => item.id)).toEqual(["b", "a"]);
    });

    it("does not render a parent holding the ref in state in a loop", () => {
        let parentRenders = 0;
        const Parent = () => {
            parentRenders++;
            const [, setSelectRef] = React.useState<MultiSelectRefInterface<Fact> | null>(null);
            const ids = ["a", "b"].map(id => id);
            return <MultiSelect ref={setSelectRef} queryRef={null} items={FACTS} value={ids} />;
        };
        render(<Parent />);

        expect(parentRenders).toBeLessThan(5);
    });
});

describe("reload", () => {
    it("reads the options again with the permission", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        const queryRef = queryRefOf();
        render(<MultiSelect ref={ref} queryRef={queryRef} items={FACTS} value={[]} />);

        ref.current?.reload();

        expect(queryRef.load).toHaveBeenCalledTimes(1);
    });

    it("does nothing without the permission", () => {
        const ref = React.createRef<MultiSelectRefInterface<Fact>>();
        const queryRef = queryRefOf({hasPermission: false});
        render(<MultiSelect ref={ref} queryRef={queryRef} items={FACTS} value={[]} />);

        ref.current?.reload();

        expect(queryRef.load).not.toHaveBeenCalled();
    });

    it("does nothing before the query ref exists", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        render(<SingleSelect ref={ref} queryRef={null} items={[]} value={null} />);

        expect(() => ref.current?.reload()).not.toThrow();
    });

    it("reads the options again from a single-value selector", () => {
        const ref = React.createRef<SelectRefInterface<Fact>>();
        const queryRef = queryRefOf();
        render(<SingleSelect ref={ref} queryRef={queryRef} items={FACTS} value="a" />);

        ref.current?.reload();

        expect(queryRef.load).toHaveBeenCalledTimes(1);
    });
});
