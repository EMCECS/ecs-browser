package main

import (
  "strconv"
)

func contains(s []string, e string) bool {
  for _, a := range s {
    if a == e {
      return true
    }
  }
  return false
}

func int64toString(value int64) (string) {
	return strconv.FormatInt(value, 10)
}
