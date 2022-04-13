/* Service for retrieving the common dictionary data. */
import { bind } from '@react-rxjs/core';
import { catchError, map, of } from 'rxjs';
import { ajax } from 'rxjs/ajax';

export interface Entry {
  name?: string;
  label: string;
  help: string;
  path?: string;
  depth?: number;
}
export interface ICluster {
  name: string;
  label: string;
  help: string;
  path?: string;
  depth?: number;
}
export interface Category extends Entry {
  clusters: ICluster[];
}
interface ISubcategory extends Entry {
  clusters: ICluster[];
}
interface ICategory extends Entry {
  subcategories: ISubcategory[];
}
export interface ICommonDictionary {
  default_dict: string;
  custom_dict: string;
  use_default_dict: boolean;
  timestamp: string;
  categories: ICategory[];
}

export interface CommonDictionaryTreeNode {
  id: string;
  label: string;
  help: string;
  children?: CommonDictionaryTreeNode[];
}

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

export const [useCommonDictionary, commonDictionary$] = bind(
  ajax
    .getJSON<ICommonDictionary>(
      'http://docuscope.eberly.cmu.edu/common_dictionary'
    )
    .pipe(
      map((data) => new CommonDictionary(data)),
      catchError((err) => {
        console.error(err);
        /* TODO: add interface report here */
        return of(err);
      })
    ),
  null
);
