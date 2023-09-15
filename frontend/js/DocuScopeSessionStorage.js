/**
 *
 */
class DocuScopeSessionStorage {
  /**
   *
   */
  constructor(aKey) {
    this.useEncoding = true;
    this.cookieJar = {};
    this.equalCharacter = "=";
    this.key = aKey;

    if (this.key == undefined) {
      this.key = "dswa";
    } else {
      if (this.key == null) {
        this.key = "dswa";
      }
    }

    this.reload();
  }

  /**
   *
   */
  setValue(aKey, aValue) {
    //console.log ("setValue ()");
    this.cookieJar[aKey] = aValue;
    this.save();
  }

  /**
   *
   */
  getValue(aKey, aDefault) {
    if (Object.prototype.hasOwnProperty.call(this.cookieJar, aKey)) {
      return this.cookieJar[aKey];
    }

    return aDefault;
  }

  /**
   *
   */
  setBooleanValue(aKey, aValue) {
    this.setValue(aKey, aValue.toString());
  }

  /**
   *
   */
  getBooleanValue(aKey) {
    let booleanString = this.getValue(aKey, false);
    if (booleanString) {
      if (booleanString.toLowerCase() == "true") {
        return true;
      }
    }

    return false;
  }

  /**
   *
   */
  setIntegerValue(aKey, aValue) {
    this.setValue(aKey, aValue.toString());
  }

  /**
   *
   */
  getIntegerValue(aKey) {
    let integerString = this.getValue(aKey, 0);
    if (integerString) {
      return parseInt(integerString);
    }

    return false;
  }

  /**
   *
   */
  setFloatValue(aKey, aValue) {
    this.setValue(aKey, aValue.toString());
  }

  /**
   *
   */
  getFloatValue(aKey) {
    let floatString = this.getValue(aKey, 0.0);
    if (floatString) {
      return parseFloat(floatString);
    }

    return false;
  }

  /**
   *
   */
  setJSONObject(aKey, anObject) {
    let jsonString = JSON.stringify(anObject);
    this.setValueEncoded(aKey, jsonString);
  }

  /**
   *
   */
  getJSONObject(aKey) {
    let jsonString = this.getValueEncoded(aKey);
    return JSON.parse(jsonString);
  }

  /**
   *
   */
  encode(aString) {
    return btoa(unescape(encodeURIComponent(aString)));
  }

  /**
   *
   */
  decode(aString) {
    return decodeURIComponent(escape(window.atob(aString)));
  }

  /**
   *
   */
  setValueEncoded(aKey, aValue) {
    //console.log ("setValueEncoded ()");
    if (this.useEncoding == true) {
      this.setValue(aKey, this.encode(aValue));
    } else {
      this.setValue(aKey, aValue);
    }
  }

  /**
   * This is a problem because W10= decodes to [] and that might not be
   * a very good default value
   */
  getValueEncoded(aKey) {
    //console.log ("getValueEncoded ()");

    if (this.useEncoding == true) {
      let raw = this.getValue(aKey, "");
      if (raw == "") {
        return "[]";
      }
      return this.decode(raw);
    }

    let raw = this.getValue(aKey, "[]");
    return raw;
  }

  /**
   *
   */
  save() {
    //console.log ("save ()");
    //console.log (cookieJar);

    let data = "";
    let index = 0;

    for (let [key, value] of Object.entries(this.cookieJar)) {
      let separator = ";";
      if (index == 0) {
        separator = "";
      }

      data = data + separator + key + this.equalCharacter + value;

      index++;
    }

    window.localStorage.setItem(this.key, data);

    // Make sure that our internal model is the same as what's on disk
    this.reload();
  }

  /**
   *
   */
  reload() {
    //console.log ("reload ()");

    let allCookies = window.localStorage.getItem(this.key);
    if (allCookies != null) {
      this.parse(allCookies);
    }
  }

  /**
   *
   */
  parse(data) {
    //console.log ("parse ()");
    let splitter = data.split(";");

    this.cookieJar = {};

    for (let i = 0; i < splitter.length; i++) {
      let kv = splitter[i].split(this.equalCharacter);
      if (kv.length > 1) {
        this.cookieJar[kv[0].trim()] = kv[1].trim();
      }
    }
  }
}

export default DocuScopeSessionStorage;
