import {Ref, useCallback, useImperativeHandle, useMemo} from "react";
import type {LysQueryRefInterface} from "../LysQueryProvider/types";
import type {HasPermissionRefInterface} from "../LysMutationProvider/types";

/**
 * An option a selector loads: anything carrying the id its value holds.
 */
export interface SelectItem {
    id: string;
}

/**
 * The surface every selector exposes upward, single or multiple: the
 * permission contract of the restricted components, the state of the
 * options and a way to read them again.
 */
interface SelectBaseRefInterface extends HasPermissionRefInterface {
    /** True while the options are being read: an empty selection means nothing yet. */
    isLoading: boolean;
    /** Read the options again — after the caller created one, for instance. */
    reload: () => void;
}

/**
 * Ref of a single-value selector.
 */
export interface SelectRefInterface<TItem extends SelectItem = SelectItem> extends SelectBaseRefInterface {
    /**
     * The selected option, resolved from the loaded ones. Null without a
     * value, before the options arrive, or when the value is not among
     * them — the selector knows the options it read, nothing more.
     */
    selectedItem: TItem | null;
}

/**
 * Ref of a multiple-value selector.
 */
export interface MultiSelectRefInterface<TItem extends SelectItem = SelectItem> extends SelectBaseRefInterface {
    /**
     * The selected options, resolved from the loaded ones, in the order
     * of the value. A value missing from the loaded options is left out:
     * the caller that holds such ids resolves them itself.
     */
    selectedItems: TItem[];
}

interface SelectRefSource<TItem extends SelectItem> {
    /** The ref of the selector's LysQueryProvider: permission, loading and reload come from it. */
    queryRef: LysQueryRefInterface | null;
    /** The loaded options, memoized by the caller on its query data. */
    items: TItem[];
}

/** Separator of the selection key: never part of an id. */
const KEY_SEPARATOR = "\u0000";

/**
 * Permission, loading state and reload, shared by both hooks.
 *
 * The reload goes through the permission: without access the query was
 * never allowed to run, and asking for it would only raise a flag the
 * provider ignores.
 */
function useSelectBase(queryRef: LysQueryRefInterface | null): SelectBaseRefInterface {
    const hasPermission = !!queryRef?.hasPermission;
    const isLoading = !!queryRef?.isLoading;
    const load = queryRef?.load;

    const reload = useCallback(() => {
        if (hasPermission) {
            load?.();
        }
    }, [hasPermission, load]);

    return useMemo(() => ({hasPermission, isLoading, reload}), [hasPermission, isLoading, reload]);
}

/**
 * Exposes the ref of a single-value selector.
 *
 * Call it in a selector built on a LysQueryProvider and forwardRef; the
 * parent reads the ref the way it reads a LysQueryProvider's — through a
 * state setter (`ref={setSelectRef}`), so a new selection renders it again.
 */
export function useSelectRef<TItem extends SelectItem>(
    ref: Ref<SelectRefInterface<TItem>>,
    {queryRef, items, value}: SelectRefSource<TItem> & {value: string | null | undefined}
): void {
    const base = useSelectBase(queryRef);

    const selectedItem = useMemo(
        () => (value ? items.find(item => item.id === value) ?? null : null),
        [items, value]
    );

    useImperativeHandle(ref, () => ({...base, selectedItem}), [base, selectedItem]);
}

/**
 * Exposes the ref of a multiple-value selector.
 *
 * Same contract as useSelectRef, an absent value meaning no selection as
 * it does there: a form hands its controls no value until one is set. The
 * selection is compared by content, not by identity: a parent passing
 * `ids.map(...)` hands a new array on every render, and a handle rebuilt
 * for each of them would render the parent again through its state
 * setter — a loop.
 */
export function useMultiSelectRef<TItem extends SelectItem>(
    ref: Ref<MultiSelectRefInterface<TItem>>,
    {queryRef, items, value}: SelectRefSource<TItem> & {value: string[] | null | undefined}
): void {
    const base = useSelectBase(queryRef);
    const valueKey = (value ?? []).join(KEY_SEPARATOR);

    const selectedItems = useMemo(() => {
        const byId = new Map(items.map(item => [item.id, item]));
        return valueKey
            .split(KEY_SEPARATOR)
            .map(id => byId.get(id))
            .filter((item): item is TItem => !!item);
    }, [items, valueKey]);

    useImperativeHandle(ref, () => ({...base, selectedItems}), [base, selectedItems]);
}
