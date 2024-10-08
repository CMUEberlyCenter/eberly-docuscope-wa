/**
 * @fileoverview Service for retrieving the common dictionary data.
 */
import { bind } from '@react-rxjs/core';
import { catchError, filter, map, of, switchMap } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { settings$ } from './settings.service';

/**** Common Dictionary schema ****/
/** Shared category entry information. */
interface Entry {
  name?: string;
  label: string;
  help: string;
  path?: string;
  depth?: number;
}
/** Form of third level of common dictionary categories. */
interface ICluster {
  name: string;
  label: string;
  help: string;
  path?: string;
  depth?: number;
}
/** Form of second level of common dictionary categories. */
interface ISubcategory extends Entry {
  clusters: ICluster[];
}
/** Form of first level of common dictionary categories. */
interface ICategory extends Entry {
  subcategories: ISubcategory[];
}
/**
 * Top level form of the common dictionary json.
 */
export interface ICommonDictionary {
  default_dict: string;
  custom_dict: string;
  use_default_dict: boolean;
  timestamp: string;
  categories: ICategory[];
}

/** Interface for tree walkable nodes. */
export interface CommonDictionaryTreeNode {
  id: string;
  label: string;
  help: string;
  children?: CommonDictionaryTreeNode[];
}

/**
 * Common dictionary representation.
 * The common dictionary is the higher order category structure
 * of DocuScope categories.
 */
export class CommonDictionary implements ICommonDictionary {
  default_dict!: string;
  custom_dict!: string;
  use_default_dict!: boolean;
  timestamp!: string;
  categories!: ICategory[];

  constructor(data: ICommonDictionary) {
    Object.assign(this, data);
    for (const category of this.categories) {
      category.path = category.label;
      category.depth = 0;
      for (const subcategory of category.subcategories) {
        subcategory.depth = 1;
        subcategory.path = `${category.path} > ${subcategory.label}`;
        for (const cluster of subcategory.clusters) {
          cluster.depth = 2;
          cluster.path = `${subcategory.path} > ${cluster.label}`;
        }
      }
    }
  }

  /** Get the tree representation of the categories in this common dictionary. */
  get tree(): CommonDictionaryTreeNode[] {
    return this.categories.map((category: ICategory) => ({
      id: category.name ?? category.label,
      label: category.label,
      help: category.help,
      children: category.subcategories.map((subcategory: ISubcategory) => ({
        label: subcategory.label,
        id: subcategory.name ?? subcategory.label,
        help: subcategory.help,
        children: subcategory.clusters.map((cluster: ICluster) => ({
          label: cluster.label,
          id: cluster.name,
          help: cluster.help,
        })),
      })),
    }));
  }

  /** Get the flat list of all categories in this common dictionary. */
  get nodes(): Entry[] {
    return this.categories.reduce(
      (acc, cat) => [
        ...acc,
        cat,
        ...cat.subcategories.reduce(
          (sa, sub) => [...sa, sub, ...sub.clusters],
          [] as Entry[]
        ),
      ],
      [] as Entry[]
    );
  }
}

/** react-rxjs hook for supplying the instance of the common dictionary. */
export const [useCommonDictionary, commonDictionary$] = bind(
  // get url from settings.
  settings$.pipe(
    filter((settings) => !!settings.docuscope && !!settings.impressions),
    switchMap((settings) =>
      fromFetch<ICommonDictionary>(settings.common_dictionary, {
        selector: (res) => res.json(),
      }).pipe(
        map((data) => new CommonDictionary(data)),
        catchError((err) => {
          console.error(err);
          /* TODO: add interface report here */
          return of(err);
        })
      )
    )
  ),
  null
);
