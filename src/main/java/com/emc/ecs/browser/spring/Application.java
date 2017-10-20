package com.emc.ecs.browser.spring;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.embedded.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class Application {

    public static void main(String[] args) throws Exception {
        SpringApplication.run(Application.class, args);
    }

    @Bean
    public FilterRegistrationBean filterRegistrationBean() {
        FilterRegistrationBean registrationBean = new FilterRegistrationBean();
        ServiceFilter serviceFilter = new ServiceFilter();
        registrationBean.setFilter(serviceFilter);
        registrationBean.addUrlPatterns("/service/*");
        registrationBean.setOrder(0);
        return registrationBean;
    }

}
