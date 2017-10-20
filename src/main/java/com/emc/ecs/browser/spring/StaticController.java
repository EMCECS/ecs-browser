package com.emc.ecs.browser.spring;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

//@Configuration
@Controller
//@EnableAutoConfiguration
//@ComponentScan
public class StaticController {

    private static final Logger log = LoggerFactory.getLogger(StaticController.class);


    @RequestMapping("/")
    public String index() {
        log.info("Returning index");
        return "index.html";
    }

    @RequestMapping("/raw")
    public String raw() {
        log.info("Returning raw");
        return "raw";
    }

}
