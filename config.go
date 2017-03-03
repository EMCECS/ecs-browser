package main

type Config struct {
	Examples []Example `json:"examples"`
}

type Example struct {
	Name string `json:"name"`
	Api string `json:"api"`
	Steps []Step `json:"steps"`
}

type Step struct {
	Description string `json:"description"`
	ExpectedResponseCode string `json:"expected_response_code"`
	Path string `json:"path"`
  Range string `json:"range"`
  Data string `json:"data"`
  Method string `json:"method"`
  Headers map[string]string `json:"headers"`
	Inputs []string `json:"inputs"`
}
